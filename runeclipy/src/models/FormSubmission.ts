import mongoose from "mongoose";

const FormSubmissionSchema = new mongoose.Schema({
  userId: String,
  username: String,
  formTitle: String,
  fieldName: String,
  inputValue: String,
  channelId: String,
}, { timestamps: true, strict: false });

export default mongoose.models.FormSubmission || mongoose.model("FormSubmission", FormSubmissionSchema, "formsubmissions");
