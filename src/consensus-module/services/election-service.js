const state = require("../data/state");
const log = require("../data/log");
const Constants = require("../../utils/constants");
const rpc_clients = require("../../rpc/rpc-client");

let timerHandle;

function generateRandomInterval() {
    //random interval between 300ms and 500ms
    return Math.floor(Math.random() * (500 - 300 + 1) + 300);
}

function stopElectionTimer() {
    console.log("Stoping election timer!");
    clearInterval(timerHandle);
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

function becomeFollower(term) {
    state.setCurrentTerm(term);
    state.setStatus(Constants.status.Follower);
    state.setVotedFor(null);
}

async function sendVoteRequest(client) {
    const [clientId, clientObj] = client;
    const requestVoteArgs = {
        term: state.getCurrentTerm(),
        candidateId: Constants.SELF_ID,
        ...getLastLogIndexAndTerm()
    };
    result = await new Promise((resolve, reject) => {
        clientObj.requestVote(requestVoteArgs, (error, result) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Result from candidate ${clientId} is ${JSON.stringify(result)}`);
                resolve(result);
            }
        });
    });
    return result;
}

function handleVoteResponse(voteResponse) {
    if (state.getStatus() !== Constants.status.Candidate) {
        console.log(`While waiting for response, status was changed to ${state.getStatus()}`);
        return false;
    }

    if (voteResponse.term > state.getCurrentTerm()) {
        console.log('Term in response is bigger, hence becoming a follower.');
        becomeFollower(voteResponse.term);
        return false;
    } else if (voteResponse.term === state.getCurrentTerm() && voteResponse.voteGranted) {
        console.log(`Vote granted in handleVoteResponse is true; term is ${voteResponse.term}; current term is ${state.getCurrentTerm()}; voteGranted is ${voteResponse.voteGranted}`);
        return true;
    }
}

function checkIfMajority(votesReceived) {
    if (votesReceived * 2 > Constants.PEER_IDS.length + 1) {
        console.log(`${Constants.SELF_ID} wins election with ${votesReceived}`);
        return true;
    }
    return false;
}

function becomeLeader() {
    state.setStatus(Constants.status.Leader);
}

async function initiatePeerVoting() {
    let votesReceived = 1;

    await Promise.all(Object.entries(rpc_clients).map(async (client) => {
        let voteResponse;
        try {
            voteResponse = await sendVoteRequest(client);
        } catch (error) {
            console.log(error.message);
            return;
        }
        const voteGranted = handleVoteResponse(voteResponse);
        if (voteGranted === false) {
            return;
        } else {
            votesReceived = votesReceived + 1;
            if (checkIfMajority(votesReceived) === true) {
                becomeLeader();
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
        stopElectionTimer();
    } else {
        response.voteGranted = false;
    }
    response.term = state.getCurrentTerm();
    return response;
}

module.exports = {
    startElection: async function () {
        stopElectionTimer();
        state.setStatus(Constants.status.Candidate);
        state.incrementCurrentTerm();
        state.setVotedFor(Constants.SELF_ID);

        console.log(`Becomes Candidate; currentTerm is ${state.getCurrentTerm()}; log last index is ${log.length() - 1} `);

        await initiatePeerVoting();

        if (state.getStatus() === Constants.status.Candidate) {
            this.setOffElectionTimer();
        }
        console.log("election status is " + state.getStatus());
    },
    processVoteRequest: function (requestVoteArgs) {
        console.log('request coming at ' + new Date().getTime());
        const { lastLogIndex, lastLogTerm } = getLastLogIndexAndTerm();
        console.log(`RequestVote: ${requestVoteArgs}; currentTerm: ${state.getCurrentTerm()}; votedFor: ${state.getVotedFor()}; lastLogIndex/lastLogTerm: (${lastLogIndex}/${lastLogTerm})`);

        if (requestVoteArgs.term > state.getCurrentTerm()) {
            console.log(`Term in requestVote is bigger: ${requestVoteArgs.term}; currentTerm is ${state.getCurrentTerm()}; Becoming a follower.`);
            becomeFollower(requestVoteArgs.term);
            console.log("currentTerm in procesVoteRequest is " + state.getCurrentTerm());
            stopElectionTimer();
        }
        const response = voteForLeader(requestVoteArgs, lastLogIndex, lastLogTerm);

        console.log('Status is ' + state.getStatus());
        console.log(`RequestVote response: ${JSON.stringify(response)}`);
        return response;
    },
    setOffElectionTimer: function () {
        if (timerHandle) {
            clearInterval(timerHandle);
        }
        console.log('Timer started at ' + new Date().getTime());
        timerHandle = setInterval(() => {
            console.log('callback executed at ' + new Date().getTime());
            this.startElection();
        }), generateRandomInterval();
    }
}