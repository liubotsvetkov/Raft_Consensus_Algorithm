const fs = require('fs');
const Constants = require("../../utils/constants");
const log = require("./log");

const state = {
    ...loadPersistentState(),
    commitIndex: 0,
    lastApplied: 0,
    status: Constants.status.None,
    leaderId: undefined,
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
        state.votedFor = newVotedFor;
        persistState();
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
        return state.nextIndex[nodeId] || 0;
    },
    setMatchIndex: function (nodeId, newMatchIndex) {
        if (nodeId && newMatchIndex) {
            state.matchIndex[nodeId] = newMatchIndex;
        }
    },
    getMatchIndex: function (nodeId) {
        return state.matchIndex[nodeId] || 0;
    },
    getStatus: function () {
        return state.status;
    },
    setStatus: function (newStatus) {
        if (Object.values(Constants.status).includes(newStatus)) {
            state.status = newStatus;
        }
    },
    setFollowerState: function (term) {
        if (term) {
            this.setCurrentTerm(term);
            this.setStatus(Constants.status.Follower);
            this.setVotedFor(null);
        }
    },
    setLeaderState: function () {
        this.setStatus(Constants.status.Leader);
        Constants.PEER_IDS.forEach((nodeId) => {
            this.setNextIndex(nodeId, log.length());
            this.setMatchIndex(nodeId, -1);
        });
    },
    getLeaderId: function () {
        return state.leaderId;
    },
    setLeaderId: function (leaderId) {
        if (leaderId) {
            state.leaderId = leaderId;
        }
    }
};