const state = require("../data/state");
const log = require("../data/log");
const Constants = require("../../utils/constants");
const rpc_clients = require("../../rpc/rpc-client");
const election_timeout_util = require("../../utils/election-timeout-util");

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
}

function sendVoteRequest(client) {
    const requestVoteArgs = {
        term: state.getCurrentTerm(),
        candidateId: Constants.SELF_ID,
        ...getLastLogIndexAndTerm()
    };

    client.voteRequest(requestVoteArgs, (error, result) => {
        if (error) {
            throw error;
        }
        return result;
    })
}

function handleVoteResponse(voteResponse) {
    if (state.getStatus() !== Constants.status.Candidate) {
        console.log(`While waiting for response, status was changed to ${state.getStatus()}`);
        return false;
    }

    if (voteResponse.term > state.getCurrentTerm()) {
        console.log('Term in response is bigger, hence becoming a follower.');
        becomeFollower(voteResponse.term);
        election_timeout_util.restartTimer();
        return false;
    } else if (voteResponse.term === state.getCurrentTerm() && voteResponse.voteGranted) {
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

async function initiatePeerVoting() {
    let votesReceived = 1;

    await Promise.all(rpc_clients.map(async (client) => {
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

function voteForLeader(requestVoteArgs) {
    const response = {};
    if (requestVoteArgs.term === state.getCurrentTerm() &&
        (state.getVotedFor() === -1 || state.getVotedFor() === requestVoteArgs.candidateId) &&
        (requestVoteArgs.lastLogTerm > lastLogTerm ||
            (requestVoteArgs.lastLogTerm === lastLogTerm && requestVoteArgs.lastLogIndex >= lastLogIndex))) {
        response.voteGranted = true;
        state.setVotedFor(requestVoteArgs.candidateId);
        election_timeout_util.restartTimer();
    } else {
        response.voteGranted = false;
    }
    response.term = state.getCurrentTerm();
    return response;
}

module.exports = {
    startElection: async function () {
        election_timeout_util.stopTimer();
        state.setStatus(Constants.status.Candidate);
        state.incrementCurrentTerm();
        state.setVotedFor(Constants.SELF_ID);

        console.log(`Becomes Candidate; currentTerm is ${state.getCurrentTerm()}; log last index is ${log.length() - 1} `);

        await initiatePeerVoting();

        if (state.getStatus() === Constants.status.Candidate) {
            election_timeout_util.restartTimer();
        }
    },
    processVoteRequest: async function (requestVoteArgs) {
        const { lastLogIndex, lastLogTerm } = getLastLogIndexAndTerm();
        console.log(`RequestVote: ${requestVoteArgs}; currentTerm: ${state.getCurrentTerm()}; votedFor: ${state.getVotedFor()}; lastLogIndex/lastLogTerm: (${lastLogIndex}/${lastLogTerm})`);

        if (requestVoteArgs.term > state.getCurrentTerm()) {
            console.log('Term in requestVote is bigger, hence becoming a follower.');
            becomeFollower(requestVoteArgs.term);
        }
        const response = voteForLeader(requestVoteArgs);

        console.log(`RequestVote response: ${response}`);
        return response;
    },
    becomeLeader: function () {
        state.setStatus(Constants.status.Follower);
    }
}