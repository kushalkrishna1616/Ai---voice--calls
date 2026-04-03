const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function test() {
  console.log("Testing Groq Key:", process.env.GROQ_API_KEY ? "EXISTS" : "MISSING");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello!' }],
      model: 'llama-3.1-8b-instant',
    });
    console.log("SUCCESS! Groq Answer:", chatCompletion.choices[0].message.content);
  } catch (err) {
    console.error("FAILURE! Error Code:", err.status || "Unknown");
    console.error("Error Message:", err.message);
    if (err.error) console.error("Error Detail:", JSON.stringify(err.error));
  }
}

test();
