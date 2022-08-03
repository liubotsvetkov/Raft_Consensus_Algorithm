const grpc = require("@grpc/grpc-js");
const proto_services = require("./proto/proto-service-loader");

const AppendEntriesService = proto_services.AppendEntriesService;

const mockResult = { term: 1, success: true };

function processAppendEntry(request) {
    console.log(request);
    return mockResult;
}

function postAppendEntry(call, callback) {
    callback(null, processAppendEntry(call.request));
}

function getServer() {
    const server = new grpc.Server();
    server.addService(AppendEntriesService.service, {
        postAppendEntry
    });
    return server;
}

module.exports = getServer();