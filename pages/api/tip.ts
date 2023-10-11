import {OpenAIStream, supabaseAdmin} from "@/utils";
import endent from "endent";

export const config = {
  runtime: "edge",
  matches: 4,
  similarity_threshold: 0.01
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { query, apiKey } = (await req.json()) as {
      query: string;
      apiKey: string;
    };

    const input = query.replace(/\n/g, " ");

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      method: "POST",
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input
      })
    });

    const json = await res.json();
    const embedding = json.data[0].embedding;

    const { data: chunks, error } = await supabaseAdmin.rpc("wbw_search", {
      query_embedding: embedding,
      similarity_threshold: config.similarity_threshold,
      match_count: config.matches
    });


    const prompt = endent`
    Use the following passages to provide an answer to the query: "${query}"

    ${chunks?.map((d: any) => d.content).join("\n\n")}
    `;

    const stream = await OpenAIStream(prompt, apiKey);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
