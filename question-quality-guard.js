/* AlfaGames LAB - Correcao de perguntas incompletas e protecao de voz */
(() => {
  'use strict';

  const texto = v => String(v ?? '').normalize('NFC').trim();
  const semLacuna = v => texto(v)
    .replace(/_{2,}/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const temTodas = (opcoes, termos) => termos.every(t => opcoes.includes(t));

  function opcoesDaQuestao(q) {
    return (q.options || q.alternativas || q.answers || []).map(x => texto(x).toLowerCase());
  }

  function reformularQuestao(q) {
    if (!q || typeof q !== 'object') return q;
    const chave = ['prompt', 'pergunta', 'question'].find(k => typeof q[k] === 'string');
    if (!chave) return q;

    const original = texto(q[chave]);
    const opcoes = opcoesDaQuestao(q);

    /* Regra para a pergunta mostrada na captura. */
    if (temTodas(opcoes, ['passado', 'presente', 'futuro']) &&
        (/\bo\s*_+/i.test(original) || /escolha a alternativa correta sobre o tema/i.test(original))) {
      q[chave] = 'Como chamamos o tempo em que uma ação já aconteceu?';
      return q;
    }

    /* Regras pedagógicas baseadas nas alternativas, caso o texto esteja genérico. */
    if (temTodas(opcoes, ['manhã', 'tarde', 'noite']) && /_+|sobre o tema/i.test(original))
      q[chave] = 'Qual período do dia acontece depois da tarde?';
    else if (temTodas(opcoes, ['visão', 'audição', 'olfato']) && /_+|sobre o tema/i.test(original))
      q[chave] = 'Qual sentido usamos para perceber os sons?';
    else if (temTodas(opcoes, ['renovável', 'não renovável']) && /_+|sobre o tema/i.test(original))
      q[chave] = 'Como podemos classificar um recurso que se renova na natureza?';
    else if (temTodas(opcoes, ['reduzir', 'reutilizar', 'reciclar']) && /_+|sobre o tema/i.test(original))
      q[chave] = 'Qual ação significa usar novamente um objeto antes de descartá-lo?';
    else
      q[chave] = semLacuna(original)
        .replace(/^Desafio:\s*escolha a alternativa correta sobre o tema\.\s*/i, 'Escolha a alternativa correta: ')
        .replace(/\b[OoAa]\s*\.$/, '')
        .trim();

    return q;
  }

  function percorrer(valor) {
    if (Array.isArray(valor)) { valor.forEach(percorrer); return valor; }
    if (!valor || typeof valor !== 'object') return valor;
    reformularQuestao(valor);
    Object.values(valor).forEach(v => { if (v && typeof v === 'object') percorrer(v); });
    return valor;
  }

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const resposta = await fetchOriginal(...args);
    const url = texto(args[0]?.url || args[0]);
    if (!/questions\.json(?:[?#]|$)/i.test(url)) return resposta;
    const dados = percorrer(await resposta.clone().json());
    return new Response(JSON.stringify(dados), {
      status: resposta.status,
      statusText: resposta.statusText,
      headers: {'Content-Type': 'application/json; charset=utf-8'}
    });
  };

  if ('SpeechSynthesisUtterance' in window) {
    const Original = window.SpeechSynthesisUtterance;
    window.SpeechSynthesisUtterance = function(v = '') {
      return new Original(semLacuna(v).replace(/\bunderline\b/gi, ''));
    };
    window.SpeechSynthesisUtterance.prototype = Original.prototype;
  }
})();
