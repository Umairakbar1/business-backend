import mongoose from "mongoose";
const { Schema, model } = mongoose;

const QueryTicketSchema = new mongoose.Schema({
    subject: String,
    message: String,
    senderId: mongoose.Schema.Types.ObjectId,
    receiverId: mongoose.Schema.Types.ObjectId,
    reply: String,
    status: String,
  });
  
  const QueryTicket = model('QueryTicket', QueryTicketSchema);
  export default QueryTicket;
  