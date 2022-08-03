module.exports = {
    LEADER_ID: process.env.LEADER_ID,
    PEER_IDS: process.env.PEER_IDS.split(','),
    RPC_SERVER_PORT: 50051,
    REST_SERVER_PORT: 3000
}