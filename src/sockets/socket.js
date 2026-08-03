export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);
    socket.emit("notification", { message: "Xin chào từ Socket.IO 🎉" });
    socket.on("send_message", (data) => {
      console.log("📨 Nhận tin nhắn:", data);
      io.emit("receive_message", data); 
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });
};
