const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const RAFT_SERVICE_PROTO_PATH = __dirname + "/raft-service.proto";

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const raftServicePkgDef = protoLoader.loadSync(RAFT_SERVICE_PROTO_PATH, options);

const RaftService = grpc.loadPackageDefinition(raftServicePkgDef).RaftService;

module.exports = RaftService;