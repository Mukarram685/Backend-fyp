import mongoose from "mongoose";
import dns from "dns";

if (process.env.NODE_ENV !== "production") {
    try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (e) {
        console.warn("Could not set DNS servers:", e.message);
    }
}

let isConnected = false;

const ConnectDB = async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }

    try {
        if (!process.env.MONGO_URL) {
            console.warn("MONGO_URL is not defined in environment variables");
            return;
        }
        const connect = await mongoose.connect(process.env.MONGO_URL);
        isConnected = true;
        console.log(`MongoDB Connected: ${connect.connection.host}`);
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
        if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
            // Only exit process in local non-production if critical
            // process.exit(1);
        }
    }
};

export default ConnectDB;