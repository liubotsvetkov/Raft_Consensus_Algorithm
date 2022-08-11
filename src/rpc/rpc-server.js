const grpc = require("@grpc/grpc-js");
const RaftService = require("./proto/proto-loader");
const consensus_service = require("../consensus-module/consensus-service");

function appendEntries(call, callback) {
    callback(null, consensus_service.appendEntries(call.request));
}

function requestVote(call, callback) {
    callback(null, consensus_service.processVoteRequest(call.request));
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