import mongoose from "mongoose";

export const connectDB = async ()=>{
    try {
      const cnn = await mongoose.connect(process.env.MONGODB_URI)
      console.log(`connected to database : ${cnn.connection.host}`);
      
    } catch (err) {

        console.log("mongoDB connection error:",err);
        

        
    }
}