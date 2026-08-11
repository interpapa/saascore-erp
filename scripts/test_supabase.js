const { createClient } = require('@supabase/supabase-js');

const url = "https://exwlvhrenihlagcmucvn.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4d2x2aHJlbmlobGFnY211Y3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzUyNTgsImV4cCI6MjEwMTk1MTI1OH0.MGrTeDr5P_5MCjr2D-Y-xl4t7KuNjXhSlsvCHTL4mq0";

const supabase = createClient(url, key);

async function test() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "password123"
    });
    if (error) {
      console.log("AUTH ERROR:", error.message, error.status);
    } else {
      console.log("AUTH SUCCESS:", data);
    }
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
  }
}

test();
