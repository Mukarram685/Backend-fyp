import mongoose from "mongoose";

const ConnectDB = async () => {

    try {
        const connect = await mongoose.connect(process.env.MONGO_URL, { family: 4 });
        console.log(`MongoDB Connected: ${connect.connection.host}`);

    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
    }

}

export default ConnectDB