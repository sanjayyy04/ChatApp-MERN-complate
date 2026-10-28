const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 2000, default: "" },
    messageType: { type: String, enum: ["text", "image", "video", "file"], default: "text" },
    attachmentUrl: { type: String, default: "" },
    attachmentName: { type: String, default: "" },
    attachmentMime: { type: String, default: "" },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

groupMessageSchema.pre("validate", function validateContent() {
    const hasText = Boolean(this.text?.trim());
    const hasAttachment = Boolean(this.attachmentUrl);
    if (!hasText && !hasAttachment) {
        this.invalidate("text", "Message must include text or an attachment.");
    }
});

groupMessageSchema.index({ group: 1, createdAt: 1 });

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
