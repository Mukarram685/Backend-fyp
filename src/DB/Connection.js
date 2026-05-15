import mongoose from "mongoose";

const ConnectDB = async () => {
    if (!process.env.MONGO_URL) {
        console.error("MongoDB Connection Error: MONGO_URL is not defined in environment variables.");
        return;
    }

    try {
        const connect = await mongoose.connect(process.env.MONGO_URL, { 
            family: 4,
            serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds
        });
        console.log(`MongoDB Connected: ${connect.connection.host}`);

    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
        // Do not re-throw here to allow the Express app to start and serve a 500 error 
        // with more context later if needed, rather than crashing the whole function.
    }
}

export default ConnectDB