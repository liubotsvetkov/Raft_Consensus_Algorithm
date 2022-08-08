const grpc = require("@grpc/grpc-js");
const RaftService = require("./proto/proto-loader");
const election_service = require("../consensus-module/services/election-service");

const mockResult = { term: 1, success: true };
const mockResult2 = { term: 1, voteGranted: true };

function processAppendEntries(request) {
    console.log(request);
    return mockResult;
}

function appendEntries(call, callback) {
    callback(null, processAppendEntries(call.request));
}

function requestVote(call, callback) {
    callback(null, election_service.processVoteRequest(call.request));
}

function getServer() {
    const server = new grpc.Server();
    server.addService(RaftService.service, {
        appendEntries,
        requestVote
    });
    return server;
}

module.exports = getServer();