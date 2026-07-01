import mongoose from "mongoose";
// import dns from "dns";

// dns.setServers(["8.8.8.8", "1.1.1.1"]);

const ConnectDB = async () => {

    try {
        // console.log("Connecting to MONGO_URL:", process.env.MONGO_URL);
        const connect = await mongoose.connect(process.env.MONGO_URL);
        // console.log(`MongoDB Connected: ${connect.connection.host}`);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

}

export default ConnectDB