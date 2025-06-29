import { config } from "dotenv";

config();

const {
  DB_URI,
}= process.env;

const dbUri = DB_URI;


export default {dbUri}