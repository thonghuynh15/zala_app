// Message model for zalachat-mobile
class Message {
  constructor(id, senderId, receiverId, content, timestamp, type) {
    this.id = id;
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.content = content;
    this.timestamp = timestamp;
    this.type = type;
  }
}

export default Message;
