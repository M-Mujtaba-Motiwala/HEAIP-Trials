const test = async () => {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: "a cat",
      n: 1,
      size: "1024x1024",
    }),
  });
  console.log(response.status);
  const data = await response.json();
  if (data.data && data.data[0]) {
    console.log("b64_json present:", !!data.data[0].b64_json);
    console.log("url present:", !!data.data[0].url);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
};
test();
