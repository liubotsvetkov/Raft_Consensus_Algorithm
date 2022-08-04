const state = require("../data/state");
const Constants = require("../../utils/constants");

module.exports = {
    startElection: function () {
        state.setStatus(Constants.status.Candidate);
        state.incrementCurrentTerm();
        state.setVotedFor(Constants.SELF_ID)
    }
}