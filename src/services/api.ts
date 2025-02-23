
import { Question, UserContext, ExploreResponse } from "../types";


const transformQuestion = (rawQuestion: Question): Question => ({
  text: rawQuestion.text,
  options: rawQuestion.options,
  correctAnswer: rawQuestion.correctAnswer,
  explanation: rawQuestion.explanation,
  difficulty: rawQuestion.difficulty,
  ageGroup: rawQuestion.ageGroup,
  topic: rawQuestion.topic,
  subtopic: rawQuestion.subtopic || "",
  questionType: rawQuestion.questionType || "conceptual"
});

// const apiUrl = 'http://localhost:3003'
const apiUrl = 'https://educasm-backend.onrender.com'

export const api = {
 

  apiUrl: apiUrl,

  async getQuestion(topic: string, level: number, userContext: UserContext): Promise<Question> {
    try {
      const response = await fetch(apiUrl + "/api/gpt/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, userContext }),
      });
       console.log('API getQuestion response:', response);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.statusText}, Response: ${errorText}`);
      }
  
      const resp = await response.json();

      console.log("Rate limit reached", resp);

    
        if (resp.limitReached) {
          console.log("Rate limit reached", resp);
         throw new Error("Rate limit reached");

          // showLimitMessage(resp.message); // Call function to show popup
        }else{
          return transformQuestion(resp.data);

        }
    } catch (error) {
      console.error("Question generation error:-",error  );
     if(error == "Error: Rate limit reached"){
      throw new Error("Rate limit reached");
     }else{
       throw new Error("Failed to generate question");
     }
    }
  },
  





  async generateTest(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    try {


      console.log('API generateTest called with:', { topic, examType });

      const response = await fetch(apiUrl +  "/api/gpt/getTestQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, examType }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const resp = await response.json();

      console.log('API received questions:0', resp);
      const questions = resp.data
      console.log('API received questions:', questions);
      return questions.map(transformQuestion);
    } catch (error) {
      console.error("Test generation error:", error);
      throw new Error("Failed to generate test");
    }
  },


  async explore(query: string, userContext: UserContext): Promise<ExploreResponse> {
    try {
      const response = await fetch(apiUrl + "api/gpt/getExploreContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, userContext}),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
 
      const resp = await response.json();
      console.log('API getQuestion response:', resp);

      return resp.data;
    } catch (error) {
      console.error("Explore error:", error);
      throw new Error("Failed to explore topic");
    }
  },

  async streamExploreContent(
    query: string,
    userContext: UserContext,
    onChunk: (content: { text?: string; topics?: any[]; questions?: any[] }) => void
  ) {
    console.log('hrere  ')
    const response = await fetch( apiUrl + "/api/gpt/streamExploreContent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, userContext }),
    });
    console.log('hrere 2' , response)
   if(response.status == 203){
    return 'limit reached'
   }

    if (!response.body) {
      console.error("Response body is empty");
      return;
    }
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
  
    let partialChunk = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
  
      partialChunk += decoder.decode(value, { stream: true });
  
      try {
        // Process complete JSON chunks
        const lines = partialChunk.trim().split("\n");
        for (const line of lines) {
          const parsedChunk = JSON.parse(line);
          onChunk(parsedChunk);
        }
        partialChunk = ""; // Reset after processing
      } catch (error) {
        console.warn("Incomplete JSON, waiting for more data...");
      }
    }
  }
  
  
};
