"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIResponseHandler = void 0;
class OpenAIResponseHandler {
    constructor(openai, openAiThread, assistantStream, chatClient, channel, message, onDispose) {
        this.openai = openai;
        this.openAiThread = openAiThread;
        this.assistantStream = assistantStream;
        this.chatClient = chatClient;
        this.channel = channel;
        this.message = message;
        this.onDispose = onDispose;
        this.message_text = "";
        this.chunk_counter = 0;
        this.run_id = "";
        this.is_done = false;
        this.last_update_time = 0;
        this.run = async () => { };
        this.dispose = async () => {
            if (this.is_done) {
                return;
            }
            this.is_done = true;
            this.chatClient.off("ai_indicator.stop", this.handleStopGenerating);
            this.onDispose();
        };
        this.handleStopGenerating = async (event) => {
            if (this.is_done || event.message_id !== this.message.id) {
                return;
            }
            console.log("Stop generating for message ", this.message.id);
            if (!this.openai || !this.openAiThread || !this.run_id) {
                return;
            }
            try {
                await this.openai.beta.threads.runs.cancel(this.openAiThread.id, this.run_id);
            }
            catch (e) {
                console.error("Error in cancelling run", e);
            }
            await this.channel.sendEvent({
                type: "ai_indicator.clear",
                cid: this.message.cid,
                message_id: this.message.id
            });
            await this.dispose();
        };
        this.handleStreamEvent = async (event) => { };
        this.handleError = async (error) => {
            if (this.is_done) {
                return;
            }
            await this.channel.sendEvent({
                type: "ai_indicator.update",
                ai_state: "AI_STATE_ERROR",
                cid: this.message.cid, // cid = channel_id
                message_id: this.message.id
            });
            await this.chatClient.partialUpdateMessage(this.message.id, {
                set: {
                    text: error.message ?? "Error generating the messasge",
                    message: error.toString()
                }
            });
            await this.dispose();
        };
        this.performWebSearch = async (query) => {
            const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
            if (!TAVILY_API_KEY) {
                return JSON.stringify({
                    error: "Web Search is not available, API key not found.",
                });
            }
            console.log(`Performing a web search for ${query}`);
            try {
                const response = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${TAVILY_API_KEY}`
                    },
                    body: JSON.stringify({
                        query: query,
                        search_depth: "advanced",
                        max_results: 3,
                        include_answer: true,
                        include_raw_content: false,
                    }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`Tavily search failed for query "${query}: `, errorText);
                    return JSON.stringify({
                        error: `Search failed with status: ${response.status}`,
                        details: errorText
                    });
                }
                const data = await response.json();
                console.log(`Tavily search successful for query: ${query}`);
                return JSON.stringify(data);
            }
            catch (error) {
                console.error(`An exception occurred during web search for ${query}`);
                return JSON.stringify({
                    error: "An exception occurred during web search",
                });
            }
        };
        this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
    }
}
exports.OpenAIResponseHandler = OpenAIResponseHandler;
//# sourceMappingURL=geminiResponseHandler.js.map