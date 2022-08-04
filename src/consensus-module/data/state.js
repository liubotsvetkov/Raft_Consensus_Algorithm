const fs = require('fs');
const Constants = require("../../utils/constants");

const state = {
    ...loadPersistentState(),
    commitIndex: 0,
    lastApplied: 0,
    status: Constants.status.Follower,
    nextIndex: {},
    matchIndex: {}
};

function loadPersistentState() {
    try {
        const dataBuffer = fs.readFileSync(Constants.STATE_FILE_NAME);
        const dataJSON = dataBuffer.toString();
        return JSON.parse(dataJSON);
    } catch (error) {
        console.log(error.message);
        return {
            currentTerm: 0,
            votedFor: null
        };
    }
}

function persistState() {
    const stateJSON = JSON.stringify(state);
    fs.writeFileSync(Constants.STATE_FILE_NAME, stateJSON);
}

module.exports = {
    setCurrentTerm: function (newTerm) {
        if (newTerm) {
            state.currentTerm = newTerm;
            persistState();
        }
    },
    incrementCurrentTerm: function () {
        state.currentTerm = state.currentTerm + 1;
        persistState();
    },
    getCurrentTerm: function () {
        return state.currentTerm;
    },
    setVotedFor: function (newVotedFor) {
        if (newVotedFor) {
            state.votedFor = newVotedFor;
            persistState();
        }
    },
    getVotedFor: function () {
        return state.votedFor;
    },
    setCommitIndex: function (newCommitIndex) {
        if (newCommitIndex) {
            state.commitIndex = newCommitIndex;
        }
    },
    getCommitIndex: function () {
        return state.commitIndex;
    },
    setLastApplied: function (newLastApplied) {
        if (newLastApplied) {
            state.lastApplied = newLastApplied;
        }
    },
    getLastApplied: function () {
        return state.lastApplied;
    },
    setNextIndex: function (nodeId, newNextIndex) {
        if (nodeId && newNextIndex) {
            state.nextIndex[nodeId] = newNextIndex;
        }
    },
    getNextIndex: function (nodeId) {
        return state.nextIndex[nodeId];
    },
    setMatchIndex: function (nodeId, newMatchIndex) {
        if (nodeId && newMatchIndex) {
            state.matchIndex[nodeId] = newMatchIndex;
        }
    },
    getMatchIndex: function (nodeId) {
        return state.matchIndex[nodeId];
    },
    getStatus: function () {
        return state.status;
    },
    setStatus: function (newStatus) {
        if (Object.values(Constants.status).includes(newStatus)) {
            state.status = newStatus;
        }
    }
};