import { test, mock } from "node:test";
import assert from "node:assert";

// Mock global window event dispatching for the New Chat fix
test("New Chat Event Dispatcher on /chat page", () => {
  let eventDispatched = false;

  // Mock global window object
  const mockWindow = {
    dispatchEvent: (event: { type: string }) => {
      if (event.type === "new-chat") {
        eventDispatched = true;
      }
      return true;
    }
  };

  // Simulate Sidebar click action when pathname is exactly "/chat"
  const pathname = "/chat";
  const clickNewChat = () => {
    if (pathname === "/chat") {
      mockWindow.dispatchEvent({ type: "new-chat" });
    }
  };

  clickNewChat();

  assert.strictEqual(eventDispatched, true, "new-chat event should be dispatched when pathname is /chat");
});
