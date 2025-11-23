import express from 'express'
import dotenv from 'dotenv'
import cors from "cors";
import ConnectDB from './src/DB/Connection.js';
import Router from './src/route/User.route.js';
import CompanyRouter from './src/route/Company.route.js';
import OperatorRouter from './src/route/Operator.route.js';

dotenv.config();
const app = express();
app.use(express.json());

app.use(cors());

ConnectDB();


app.use('/api/v1', Router);
app.use('/api/v1/companies', CompanyRouter);
app.use('/api/v1/operatorRoute', OperatorRouter);

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})
