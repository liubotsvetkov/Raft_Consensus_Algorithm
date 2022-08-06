const grpc = require("@grpc/grpc-js");
const RaftService = require("./proto/proto-loader");
const election_timeout_util = require("../utils/election-timeout-util");
const election_service = require("../consensus-module/services/election-service");

const mockResult = { term: 1, success: true };
const mockResult2 = { term: 1, voteGranted: true };

function processAppendEntries(request) {
    console.log(request);
    return mockResult;
}

function appendEntries(call, callback) {
    election_timeout_util.restartTimer();
    callback(null, processAppendEntries(call.request));
}

function voteRequest(call, callback) {
    election_timeout_util.restartTimer();
    callback(null, election_service.processVoteRequest(call.request));
}

function getServer() {
    const server = new grpc.Server();
    server.addService(RaftService.service, {
        appendEntries,
        voteRequest
    });
    return server;
}

module.exports = getServer();