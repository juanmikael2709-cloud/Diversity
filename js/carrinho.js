// 🛒 CARRINHO — usado por TODAS as páginas (PT e EN)
// Carregue este arquivo ANTES de produtos.js / produtos-en.js.

(function () {
    'use strict';

    // Precisa ser lido agora, enquanto o script está executando
    const SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;

    // ==========================================================
    // ⚙️ CONFIGURAÇÃO — ajuste a URL do servidor do carrinho no Render
    // ==========================================================
    const LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);

    const CONFIG = {
        api: 'https://diversidade-server-carrinho.onrender.com',
        produtos: {
            pt: 'https://diversidade-server.onrender.com',
            en: 'https://diversidade-server-eng.onrender.com'
        }
    };

    const LANG = /-en\.html$/.test(location.pathname) ? 'en' : 'pt';

    const TEXTOS = {
        pt: {
            carrinho: 'Carrinho',
            vazio: 'Seu carrinho está vazio.',
            verProdutos: 'Ver produtos',
            remover: 'Remover',
            limpar: 'Esvaziar carrinho',
            total: 'Total',
            item: 'item',
            itens: 'itens',
            carregando: 'Carregando seu carrinho...',
            erro: 'Não foi possível carregar o carrinho. Tente novamente em instantes.',
            indisponivel: 'Produto indisponível',
            diminuir: 'Diminuir quantidade',
            aumentar: 'Aumentar quantidade',
            paginaProdutos: './produtos.html'
        },
        en: {
            carrinho: 'Cart',
            vazio: 'Your cart is empty.',
            verProdutos: 'See products',
            remover: 'Remove',
            limpar: 'Empty cart',
            total: 'Total',
            item: 'item',
            itens: 'items',
            carregando: 'Loading your cart...',
            erro: 'Could not load the cart. Please try again in a moment.',
            indisponivel: 'Product unavailable',
            diminuir: 'Decrease quantity',
            aumentar: 'Increase quantity',
            paginaProdutos: './produtos-en.html'
        }
    };

    const T = TEXTOS[LANG];

    const PAGINA_CARRINHO = new URL(
        LANG === 'en' ? '../html/carrinho-en.html' : '../html/carrinho.html',
        SCRIPT_SRC
    ).href;


    // ==========================================================
    // SESSÃO — um ID guardado no navegador, enviado em toda chamada
    // ==========================================================
    const CHAVE_SID = 'diversity_sid';
    let sidEmMemoria = null;

    function gerarSid() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2);
    }

    function sid() {
        const valido = (s) => /^[A-Za-z0-9-]{8,64}$/.test(s || '');

        try {
            let s = localStorage.getItem(CHAVE_SID);

            if (!valido(s)) {
                s = gerarSid();
                localStorage.setItem(CHAVE_SID, s);
            }

            return s;
        } catch {
            // localStorage bloqueado: vale só enquanto a aba estiver aberta
            if (!sidEmMemoria) sidEmMemoria = gerarSid();
            return sidEmMemoria;
        }
    }


    // ==========================================================
    // API
    // ==========================================================
    async function chamar(rota, corpo) {
        const opcoes = corpo
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sid: sid(), ...corpo })
            }
            : { method: 'GET' };

        const url = corpo
            ? `${CONFIG.api}${rota}`
            : `${CONFIG.api}${rota}?sid=${encodeURIComponent(sid())}`;

        const resposta = await fetch(url, opcoes);
        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(dados.erro || `Erro HTTP ${resposta.status}`);
        }

        atualizarBadge(dados.totalItens);
        return dados;
    }

    const obter = () => chamar('/carrinho');
    const adicionar = (produtoId, quantidade = 1) => chamar('/carrinho/adicionar', { produtoId, quantidade });
    const atualizar = (produtoId, quantidade) => chamar('/carrinho/atualizar', { produtoId, quantidade });
    const remover = (produtoId) => chamar('/carrinho/remover', { produtoId });
    const limpar = () => chamar('/carrinho/limpar', {});


    // ==========================================================
    // ÍCONE DO CARRINHO NA NAVBAR
    // ==========================================================
    function atualizarBadge(total) {
        const badge = document.getElementById('carrinho-badge');
        if (!badge) return;

        badge.textContent = total > 99 ? '99+' : String(total);
        badge.style.display = total > 0 ? 'block' : 'none';
    }

    function injetarNavbar() {
        // A âncora é o botão "Ver coleção / View catalog", que existe em todas as páginas
        const ancora = document.querySelector('#navbar a[href*="catalogo"]');
        if (!ancora || document.getElementById('carrinho-link')) return;

        const link = document.createElement('a');
        link.id = 'carrinho-link';
        link.href = PAGINA_CARRINHO;
        link.setAttribute('aria-label', T.carrinho);
        link.style.cssText = 'position:relative;display:inline-flex;align-items:center;color:#fff;';

        link.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" ' +
            'viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" ' +
            'd="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
            '<span id="carrinho-badge" style="display:none;position:absolute;top:-8px;right:-10px;' +
            'min-width:18px;height:18px;padding:0 5px;border-radius:9999px;background:#FF5A3C;' +
            'color:#fff;font:700 10px/18px monospace;text-align:center;"></span>';

        ancora.parentElement.appendChild(link);
    }

    function carregarBadge() {
        obter().catch(() => { /* servidor dormindo: o ícone só fica sem número */ });
    }


    // ==========================================================
    // PÁGINA DO CARRINHO (só roda onde existe #carrinho-lista)
    // ==========================================================
    function escapar(texto) {
        return String(texto).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function valorNumerico(preco) {
        // "R$ 89,90" -> 89.9   |   "$ 17,81" -> 17.81
        const numero = parseFloat(
            String(preco).replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
        );
        return Number.isFinite(numero) ? numero : 0;
    }

    function simboloMoeda(preco) {
        return String(preco).replace(/[\d.,\s]/g, '');
    }

    function iniciarPaginaCarrinho() {
        const lista = document.getElementById('carrinho-lista');
        const estado = document.getElementById('carrinho-estado');
        const rodape = document.getElementById('carrinho-rodape');
        const resumoEl = document.getElementById('carrinho-resumo');
        const totalEl = document.getElementById('carrinho-total');
        const btnLimpar = document.getElementById('carrinho-limpar');

        let catalogo = {};
        let itens = [];

        function mostrarEstado(texto, comLink) {
            lista.innerHTML = '';
            rodape.classList.add('hidden');
            estado.classList.remove('hidden');
            estado.innerHTML =
                `<p class="text-stone-500 text-sm">${escapar(texto)}</p>` +
                (comLink
                    ? `<a href="${T.paginaProdutos}" class="inline-block mt-6 bg-[#FF5A3C] text-white font-bold uppercase tracking-wider text-[11px] px-6 py-4 rounded-xl hover:opacity-90 transition">${escapar(T.verProdutos)}</a>`
                    : '');
        }

        function desenhar() {
            if (itens.length === 0) {
                mostrarEstado(T.vazio, true);
                return;
            }

            estado.classList.add('hidden');
            rodape.classList.remove('hidden');

            let total = 0;
            let simbolo = '';
            let quantidadeTotal = 0;

            lista.innerHTML = itens.map((item) => {
                const produto = catalogo[item.produtoId];
                quantidadeTotal += item.quantidade;

                if (!produto) {
                    return `
                    <li class="flex items-center justify-between gap-4 border-2 border-stone-200 rounded-3xl p-4">
                        <span class="text-sm text-stone-500">${escapar(T.indisponivel)} (#${item.produtoId})</span>
                        <button type="button" data-acao="remover" data-id="${item.produtoId}"
                            class="text-xs font-bold uppercase tracking-wider border-b-2 border-black pb-1">${escapar(T.remover)}</button>
                    </li>`;
                }

                total += valorNumerico(produto.preco) * item.quantidade;
                simbolo = simbolo || simboloMoeda(produto.preco);

                const imagem = produto.imagem
                    ? `<img src="${escapar(produto.imagem)}" alt="${escapar(produto.nome)}" class="w-full h-full object-cover">`
                    : '';

                return `
                <li class="flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-stone-200 rounded-3xl p-4">
                    <div class="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0">${imagem}</div>

                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-mono uppercase tracking-widest text-stone-400">${escapar(produto.categoria)}</p>
                        <h3 class="text-lg font-black uppercase tracking-tight leading-snug">${escapar(produto.nome)}</h3>
                        <p class="font-bold">${escapar(produto.preco)}</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button type="button" data-acao="menos" data-id="${item.produtoId}" aria-label="${escapar(T.diminuir)}"
                            class="w-9 h-9 rounded-full border-2 border-stone-200 font-bold hover:border-[#FF5A3C] transition">−</button>
                        <span class="w-6 text-center font-mono font-bold">${item.quantidade}</span>
                        <button type="button" data-acao="mais" data-id="${item.produtoId}" aria-label="${escapar(T.aumentar)}"
                            class="w-9 h-9 rounded-full border-2 border-stone-200 font-bold hover:border-[#FF5A3C] transition">+</button>
                    </div>

                    <button type="button" data-acao="remover" data-id="${item.produtoId}"
                        class="text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-black border-b-2 border-transparent hover:border-black pb-1 transition self-start sm:self-center">${escapar(T.remover)}</button>
                </li>`;
            }).join('');

            resumoEl.textContent =
                `${quantidadeTotal} ${quantidadeTotal === 1 ? T.item : T.itens}`;
            totalEl.textContent =
                `${simbolo} ${total.toFixed(2).replace('.', ',')}`.trim();
        }

        async function executar(promessa) {
            try {
                const dados = await promessa;
                itens = dados.itens;
                desenhar();
            } catch (erro) {
                console.error('Erro no carrinho:', erro);
                mostrarEstado(T.erro, false);
            }
        }

        // Cliques nos botões (+, −, remover)
        lista.addEventListener('click', (evento) => {
            const botao = evento.target.closest('button[data-acao]');
            if (!botao) return;

            const id = Number(botao.dataset.id);
            const item = itens.find((i) => i.produtoId === id);
            const acao = botao.dataset.acao;

            if (acao === 'remover') {
                executar(remover(id));
            } else if (acao === 'mais' && item) {
                executar(atualizar(id, Math.min(item.quantidade + 1, 99)));
            } else if (acao === 'menos' && item) {
                executar(atualizar(id, item.quantidade - 1)); // 0 remove
            }
        });

        btnLimpar.addEventListener('click', () => executar(limpar()));

        // Carga inicial: carrinho (IDs) + catálogo do idioma (nomes e preços)
        (async function carregar() {
            mostrarEstado(T.carregando, false);

            try {
                const [dadosCarrinho, respostaProdutos] = await Promise.all([
                    obter(),
                    fetch(`${CONFIG.produtos[LANG]}/produtos`).then((r) => {
                        if (!r.ok) throw new Error(`Erro HTTP ${r.status}`);
                        return r.json();
                    })
                ]);

                catalogo = respostaProdutos.produtos || {};
                itens = dadosCarrinho.itens;
                desenhar();
            } catch (erro) {
                console.error('Erro ao carregar o carrinho:', erro);
                mostrarEstado(T.erro, false);
            }
        })();
    }


    // ==========================================================
    // INICIALIZAÇÃO
    // ==========================================================
    window.Carrinho = { sid, obter, adicionar, atualizar, remover, limpar, config: CONFIG, lang: LANG };

    document.addEventListener('DOMContentLoaded', () => {
        injetarNavbar();

        if (document.getElementById('carrinho-lista')) {
            iniciarPaginaCarrinho(); // já atualiza o badge sozinho
        } else {
            carregarBadge();
        }
    });

    // Voltar pelo botão do navegador: o número pode estar desatualizado
    window.addEventListener('pageshow', (evento) => {
        if (evento.persisted && !document.getElementById('carrinho-lista')) {
            carregarBadge();
        }
    });
})();
