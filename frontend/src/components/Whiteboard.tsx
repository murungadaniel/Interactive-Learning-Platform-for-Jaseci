import React, { useRef, useEffect } from "react";
import { useRoomContext } from "@livekit/react-components";

const Whiteboard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { room } = useRoomContext();

  // send draw events
  const send = (x: number, y: number) => {
    room.localParticipant.publishData(
      JSON.stringify({ type: "draw", x, y }),
      { reliable: false }
    );
  };

  // handle incoming events
  useEffect(() => {
    const handler = (payload: Uint8Array) => {
      const data = JSON.parse(new TextDecoder().decode(payload));
      if (data.type === "draw") {
        const canvas = canvasRef.current;
        const ctx = canvas!.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(data.x, data.y, 4, 4);
      }
    };
  
    room.on("dataReceived", handler);
    return () => {
      room.off("dataReceived", handler);
    };
  }, [room]);

  const draw = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, 4, 4);

    send(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      onMouseMove={(e) => e.buttons === 1 && draw(e)}
      style={{ background: "#111", borderRadius: 6 }}
    />
  );
};

export default Whiteboard;
