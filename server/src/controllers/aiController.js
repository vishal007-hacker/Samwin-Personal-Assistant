const prisma = require('../config/prisma');

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesAgg, expensesAgg, overdueCredits, stockCount] = await Promise.all([
      prisma.sale.aggregate({ where: { date: { gte: today } }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { date: { gte: today } }, _sum: { amount: true } }),
      prisma.credit.count({ where: { status: 'open', dueDate: { lt: new Date() } } }),
      prisma.stock.count({ where: { status: 'in_stock' } }),
    ]);

    const salesTotal = salesAgg._sum.amount || 0;
    const expensesTotal = expensesAgg._sum.amount || 0;
    const credits = overdueCredits || 0;
    const stock = stockCount || 0;

    const systemPrompt = `You are Samwin AI, an intelligent business assistant for Samwin Infotech.
You help the shop owner manage their business. 
Here is the current live data for today:
- Today's Sales: Rs. ${salesTotal}
- Today's Expenses: Rs. ${expensesTotal}
- Overdue Credits: ${credits}
- Total Items In Stock: ${stock}

Answer the user's questions clearly, concisely, and professionally. Use the data provided if asked. Keep your answers brief unless asked to elaborate.`;

    // Connect to local Ollama (assuming default port 11434 and phi3 model)
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: true,
        keep_alive: -1 // Keep model in RAM permanently to eliminate cold starts
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      let errorMessage = `Ollama HTTP error! status: ${ollamaResponse.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        // Not JSON
      }
      throw new Error(errorMessage);
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let buffer = '';

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // The last line might be incomplete, keep it in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            res.write(json.message.content);
          }
        } catch (e) {
          console.error('[AI] Stream JSON parse error:', e.message);
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('[AI] Chat error:', error.message);

    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      return res.status(503).json({
        success: false,
        message: 'Could not connect to local Ollama AI. Make sure Ollama is running.'
      });
    }

    // Bubble up model missing errors or other explicit Ollama errors
    res.status(500).json({ success: false, message: error.message || 'AI Chat failed. Is Ollama running?' });
  }
};