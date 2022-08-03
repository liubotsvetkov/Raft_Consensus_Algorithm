const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const APPEND_ENTRIES_PROTO_PATH = __dirname + "/append-entries.proto";

const appendEntriesPkgDef = protoLoader.loadSync(APPEND_ENTRIES_PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);
const AppendEntriesService = grpc.loadPackageDefinition(appendEntriesPkgDef).AppendEntriesService;

module.exports = {
    AppendEntriesService
};