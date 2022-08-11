const state = require("./data/state");
const log = require("./data/log");
const Constants = require("../utils/constants");
const rpc_clients = require("../rpc/rpc-client");

let leaderElectionTimer;

function generateRandomInterval() {
    //random interval between 300ms and 500ms
    return Math.floor(Math.random() * (50000 - 30000 + 1) + 30000);
}

function stopElectionTimer() {
    console.log("Stoping election timer!");
    clearInterval(leaderElectionTimer);
}

function getLastLogIndexAndTerm() {
    let lastLogIndex;
    let lastLogTerm;
    if (log.length() > 0) {
        lastLogIndex = log.length() - 1;
        lastLogTerm = log.findByIndex(lastLogIndex).term;
    } else {
        lastLogIndex = -1;
        lastLogTerm = -1;
    }
    return { lastLogIndex, lastLogTerm };
}

async function sendVoteRequest(client, savedCurrentTerm) {
    const [peerId, clientObj] = client;
    const requestVoteArgs = {
        term: savedCurrentTerm,
        candidateId: Constants.SELF_ID,
        ...getLastLogIndexAndTerm()
    };
    const result = await new Promise((resolve, reject) => {
        clientObj.requestVote(requestVoteArgs, (error, result) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Result from candidate ${peerId} is ${JSON.stringify(result)}`);
                resolve(result);
            }
        });
    });
    return result;
}

function handleVoteResponse(voteResponse, savedCurrentTerm) {
    if (state.getStatus() !== Constants.status.Candidate) {
        console.log(`While waiting for response, status was changed to ${state.getStatus()}`);
        return false;
    }

    if (voteResponse.term > savedCurrentTerm) {
        console.log('Term in response is bigger, hence becoming a follower.');
        startFollower(voteResponse.term);
        return false;
    } else if (voteResponse.term === savedCurrentTerm && voteResponse.voteGranted) {
        console.log(`Vote granted in handleVoteResponse is true; term is ${voteResponse.term}; current term is ${savedCurrentTerm}; voteGranted is ${voteResponse.voteGranted}`);
        return true;
    }
}

function isMajorityInConsensus(count) {
    if (count * 2 > Constants.PEER_IDS.length + 1) {
        return true;
    }
    return false;
}

function startFollower(term, setState = true, setOffTimer = true) {
    if (setState) {
        state.setFollowerState(term);
    }
    if (setOffTimer) {
        setOffElectionTimer();
    }
}

function startLeader() {
    state.setLeaderState();
    console.log(`Becomes Leader; term = ${state.getCurrentTerm()}; nextIndex = ${state.getNextIndex()}; matchIndex = ${state.getMatchIndex()}; log = ${log.getLogDataReadOnly()}`);

    let heartBeatTimer = setInterval(() => {
        if (state.getStatus() !== Constants.status.Leader) {
            clearInterval(heartBeatTimer);
        }
        leaderSendHeartBeats();
    }, 5000);

}

function leaderSendHeartBeats() {
    const savedCurrentTerm = state.getCurrentTerm();

    Object.entries(rpc_clients).map(async ([id, client_obj]) => {
        const peer = {
            id,
            client_obj
        };
        const peerNextIndex = state.getNextIndex(peer.id);
        let appendEntriesResponse;
        try {
            appendEntriesResponse = await sendAppendEntriesRequest(peer, savedCurrentTerm, peerNextIndex);
        } catch (error) {
            console.log(error.message);
            return;
        }
        handleAppendEntriesResponse(appendEntriesResponse, savedCurrentTerm, peerNextIndex, peer);
    });
}

async function sendAppendEntriesRequest(peer, savedCurrentTerm, peerNextIndex) {
    const appendEntriesArgs = {
        term: savedCurrentTerm,
        leaderId: Constants.SELF_ID,
        prevLogIndex: peerNextIndex - 1,
        prevLogTerm: this.prevLogIndex >= 0 ? log.findByIndex(this.prevLogIndex).term : -1,
        entries: log.getLogDataReadOnly(peerNextIndex),
        leaderCommit: state.getCommitIndex()
    }
    console.log(`Sending AppendEntries to peer ${peer.id}: peerNextIndex is ${peerNextIndex}, appendEntriesArgs is ${JSON.stringify(appendEntriesArgs)}`);

    const result = await new Promise((resolve, reject) => {
        peer.client_obj.appendEntries(appendEntriesArgs, (error, result) => {
            if (error) {
                reject(error);
            } else {
                console.log(`AppendEntries result from candidate ${peer.id} is ${JSON.stringify(result)}`);
                resolve(result);
            }
        })
    });
    return result;
}

function updateCommitIndex() {
    const savedCommitIndex = state.getCommitIndex();
    let matchCount;
    for (let index = state.getCommitIndex() + 1; index < log.length(); index++) {
        if (log.findByIndex(index).term === state.getCurrentTerm()) {
            matchCount = 1;
            Constants.PEER_IDS.forEach((peer_id) => {
                if (state.getMatchIndex(peer_id) >= index) {
                    matchCount = matchCount + 1;
                }
            });
            if (isMajorityInConsensus(matchCount)) {
                state.setCommitIndex(index);
            }
        }
    }
    if (state.getCommitIndex() !== savedCommitIndex) {
        console.log(`Leader sets commitIndex: ${state.getCommitIndex()}`);
    }
}

function handleAppendEntriesResponse(appendEntriesResponse, savedCurrentTerm, peerNextIndex, peer) {
    if (appendEntriesResponse.term > savedCurrentTerm) {
        console.log('Term in AppendEntries response is bigger, hence becoming a follower.');
        startFollower(appendEntriesResponse.term);
        return;
    }

    if (state.getStatus() === Constants.status.Leader && savedCurrentTerm === appendEntriesResponse.term) {
        if (appendEntriesResponse.success) {
            const newEntries = log.getLogDataReadOnly(peerNextIndex);
            state.setNextIndex(peer.id, peerNextIndex + newEntries.length);
            state.setMatchIndex(peer.id, state.getNextIndex(peer.id) - 1);
            console.log(`AppendEntries reply from ${peer.id} success: nextIndex: ${state.getNextIndex(peer.id)}, matchIndex: ${state.getMatchIndex(peer.id)}`);
            updateCommitIndex();
        } else {
            state.setNextIndex(peer.id, peerNextIndex - 1);
            console.log(`AppendEntries reply from ${peer.id}: Failure - nextIndex is ${state.getNextIndex(peer.id)}`);
        }
    }
}

function initiatePeerVoting(savedCurrentTerm) {
    let votesReceived = 1;

    return Promise.all(Object.entries(rpc_clients).map(async (client) => {
        let voteResponse;
        try {
            voteResponse = await sendVoteRequest(client, savedCurrentTerm);
        } catch (error) {
            console.log(error.message);
            return;
        }
        const voteGranted = handleVoteResponse(voteResponse, savedCurrentTerm);
        if (voteGranted === false) {
            return;
        } else {
            votesReceived = votesReceived + 1;
            if (isMajorityInConsensus(votesReceived)) {
                console.log(`${Constants.SELF_ID} wins election with ${votesReceived}`);
                startLeader();
                return;
            }
        }
    }));
}

function voteForLeader(requestVoteArgs, lastLogIndex, lastLogTerm) {
    const response = {};
    console.log(`CurrentTerm is: ${state.getCurrentTerm()}; requestVoter term is: ${requestVoteArgs.term}; VoteForLeader: votedFor is: ${state.getVotedFor()}; candidateId is: ${requestVoteArgs.candidateId}; lastLogTerm is: ${lastLogTerm}; requestLastLogTerm is: ${requestVoteArgs.lastLogTerm}; lastLogIndex is: ${lastLogIndex}; requestLastLogIndex is: ${requestVoteArgs.lastLogIndex}`);
    if (requestVoteArgs.term === state.getCurrentTerm() &&
        (state.getVotedFor() === null || state.getVotedFor() === requestVoteArgs.candidateId) &&
        (requestVoteArgs.lastLogTerm > lastLogTerm ||
            (requestVoteArgs.lastLogTerm === lastLogTerm && requestVoteArgs.lastLogIndex >= lastLogIndex))) {
        response.voteGranted = true;
        state.setVotedFor(requestVoteArgs.candidateId);
    } else {
        response.voteGranted = false;
    }
    response.term = state.getCurrentTerm();
    return response;
}

async function startElection() {
    stopElectionTimer();
    state.setStatus(Constants.status.Candidate);
    state.incrementCurrentTerm();
    const savedCurrentTerm = state.getCurrentTerm();
    state.setVotedFor(Constants.SELF_ID);

    console.log(`Becomes Candidate; currentTerm is ${savedCurrentTerm}; log last index is ${log.length() - 1} `);

    await initiatePeerVoting(savedCurrentTerm);

    if (state.getStatus() === Constants.status.Candidate) {
        this.setOffElectionTimer();
    }
    console.log("election status is " + state.getStatus());
}

function processVoteRequest(requestVoteArgs) {
    console.log('request coming at ' + new Date().getTime());
    const { lastLogIndex, lastLogTerm } = getLastLogIndexAndTerm();
    console.log(`RequestVote: ${requestVoteArgs}; currentTerm: ${state.getCurrentTerm()}; votedFor: ${state.getVotedFor()}; lastLogIndex/lastLogTerm: (${lastLogIndex}/${lastLogTerm})`);

    if (requestVoteArgs.term > state.getCurrentTerm()) {
        console.log(`Term in requestVote is bigger: ${requestVoteArgs.term}; currentTerm is ${state.getCurrentTerm()}; Becoming a follower.`);
        startFollower(requestVoteArgs.term);
        console.log("currentTerm in procesVoteRequest is " + state.getCurrentTerm());
    }
    const response = voteForLeader(requestVoteArgs, lastLogIndex, lastLogTerm);

    console.log('Status is ' + state.getStatus());
    console.log(`RequestVote response: ${JSON.stringify(response)}`);
    return response;
}

function setOffElectionTimer() {
    if (leaderElectionTimer) {
        clearInterval(leaderElectionTimer);
    }
    console.log('Timer started at ' + new Date().getTime());
    leaderElectionTimer = setInterval(() => {
        console.log('callback executed at ' + new Date().getTime());
        startElection();
    }), generateRandomInterval();
}

function replicateLogEntries(appendEntriesArgs) {
    let logInsertIndex = appendEntriesArgs.prevLogIndex + 1;
    let newEntriesIndex = 0;
    while ((logInsertIndex <= log.length() && newEntriesIndex <= appendEntriesArgs?.entries?.length) &&
        (log.findByIndex(logInsertIndex)?.term === appendEntriesArgs?.entries[newEntriesIndex]?.term)) {
        logInsertIndex = logInsertIndex + 1;
        newEntriesIndex = newEntriesIndex + 1;
    }
    if (newEntriesIndex < appendEntriesArgs?.entries?.length) {
        logEntriesToInsert = appendEntriesArgs.entries.splice(newEntriesIndex);
        console.log(`Inserting entries ${JSON.stringify(logEntriesToInsert)} from index ${logInsertIndex}`);
        log.insertFromIndex(logInsertIndex, logEntriesToInsert);
        console.log(`Log is now ${log.getLogDataReadOnly()}`);
    }
}

function updateCommitIndex(appendEntriesArgs) {
    if (appendEntriesArgs.leaderCommit > state.getCommitIndex()) {
        state.setCommitIndex(Math.min(appendEntriesArgs.leaderCommit, log.length() - 1));
        console.log(`Setting commitIndex = ${state.getCommitIndex()}`);
    }
}

function appendEntries(appendEntriesArgs) {
    console.log(`AppendEntries: ${JSON.stringify(appendEntriesArgs)}`);
    if (appendEntriesArgs.term > state.getCurrentTerm()) {
        console.log('Term in AppendEntries request is bigger, hence becoming a follower.');
        startFollower(appendEntriesArgs.term, true, false);
    }
    let response = { success: false };
    if (appendEntriesArgs.term === state.getCurrentTerm()) {
        if (state.getStatus() !== Constants.status.Follower) {
            startFollower(appendEntriesArgs.term);
        } else {
            startFollower(appendEntriesArgs.term, false, true);
        }
        if (state.getLeaderId() !== appendEntriesArgs.leaderId) {
            state.setLeaderId(appendEntriesArgs.leaderId);
        }
        if (appendEntriesArgs.prevLogIndex === -1 ||
            (appendEntriesArgs.prevLogIndex < log.length() &&
                appendEntriesArgs.prevLogTerm === log.findByIndex(appendEntriesArgs.prevLogIndex).term)) {
            response.success = true;
            replicateLogEntries(appendEntriesArgs);
            updateCommitIndex(appendEntriesArgs);
        }
    }
    response.term = state.getCurrentTerm();
    console.log(`AppendEntries response: ${JSON.stringify(response)}`);
    return response;
}

module.exports = {
    processVoteRequest,
    setOffElectionTimer,
    appendEntries
}