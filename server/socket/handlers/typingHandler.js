import { SOCKET_EVENTS } from '../events.js';

export const registerTypingHandlers = (io, socket) => {
  // Client starts typing
  socket.on(SOCKET_EVENTS.TYPING_START, ({ code, userName }) => {
    const cleanCode = code.toUpperCase().trim();
    
    // Broadcast warning to all other players in the session room
    socket.to(cleanCode).emit(SOCKET_EVENTS.TYPING_START, {
      socketId: socket.id,
      userName,
      message: `${userName} is writing...`
    });
  });

  // Client stops typing
  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ code, userName }) => {
    const cleanCode = code.toUpperCase().trim();
    
    // Broadcast stop signal to room
    socket.to(cleanCode).emit(SOCKET_EVENTS.TYPING_STOP, {
      socketId: socket.id,
      userName
    });
  });
};
