// ⚙️ MENU MOBILE — Página de Produtos
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const iconOpen = document.getElementById('icon-open');
const iconClose = document.getElementById('icon-close');

menuToggle.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('flex');
    iconOpen.classList.toggle('hidden');
    iconClose.classList.toggle('hidden');
    menuToggle.setAttribute('aria-expanded', String(isHidden));
});

// Cores de destaque disponíveis para os cards
const paletas = {
    laranja: { texto: "text-[#FF8B6B]", borda: "hover:border-[#FF5A3C]", fundo: "bg-[#FF5A3C]" },
    roxo: { texto: "text-[#8B5CF6]", borda: "hover:border-[#8B5CF6]", fundo: "bg-[#8B5CF6]" },
    verde: { texto: "text-[#14B8A6]", borda: "hover:border-[#14B8A6]", fundo: "bg-[#14B8A6]" },
    amarelo: { texto: "text-[#FFC145]", borda: "hover:border-[#FFC145]", fundo: "bg-[#FFC145]" }
};

function criarCardProduto(produto) {
    const paleta = paletas[produto.cor] || paletas.laranja;

    const imagemHtml = produto.imagem
        ? `<img src="${produto.imagem}" alt="${produto.nome}" class="w-full h-full object-cover">`
        : `<div class="w-full h-full ${paleta.fundo} flex items-center justify-center">
               <span class="text-white font-black uppercase text-xs tracking-widest opacity-70">Foto do produto</span>
           </div>`;

    const card = document.createElement('a');
    card.href = produto.link || "#";
    card.className = `group bg-white rounded-3xl border-2 border-stone-200 ${paleta.borda} overflow-hidden flex flex-col transition-colors duration-300`;

    card.innerHTML = `
        <div class="w-full aspect-square overflow-hidden">
            ${imagemHtml}
        </div>
        <div class="p-6 flex flex-col gap-2 flex-1">
            <p class="text-[10px] font-mono uppercase tracking-widest ${paleta.texto}">${produto.categoria}</p>
            <h3 class="text-lg font-black uppercase tracking-tight leading-snug">${produto.nome}</h3>
            <div class="mt-auto flex items-center justify-between pt-4">
                <span class="font-bold text-base">${produto.preco}</span>
                <span class="text-xs font-bold uppercase tracking-wider border-b-2 border-transparent group-hover:border-black pb-1 transition-colors">
                    See product
                </span>
            </div>
        </div>
    `;

    return card;
}

// 🛍️ CONEXÃO COM O SERVIDOR (Substitui a lista estática antiga)
// 🔴 Endereço do servidor rodando no Render (HTTPS, sem porta customizada)
const URL_SERVIDOR = "https://diversidade-server.onrender.com";
const URL_API = `${URL_SERVIDOR}/produtos`;
  
const grid = document.getElementById('produtos-grid');
const filtrosTags = document.getElementById('filtros-tags');
const contadorProdutos = document.getElementById('contador-produtos');

// Tag selecionada no momento
let tagSelecionada = 'todas';

// Normaliza textos para comparar tags sem diferenciar
// maiúsculas, minúsculas ou acentos.
function normalizarTag(texto) {
    return String(texto)
        .trim()
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Obtém as tags de cada produto.
// Aceita tags: ["Camisetas", "Estampas"]
// ou categoria: "Camisetas"
function obterTags(produto) {
    const tags = Array.isArray(produto.tags)
        ? produto.tags
        : produto.categoria
            ? [produto.categoria]
            : [];

    return [...new Set(
        tags
            .filter(tag => typeof tag === 'string' && tag.trim())
            .map(tag => tag.trim())
    )];
}

// Cria o visual dos botões
function criarBotaoTag(nome, valor) {
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.dataset.tag = valor;
    botao.textContent = nome;

    botao.className =
        'px-5 py-3 rounded-full border-2 text-xs font-bold ' +
        'uppercase tracking-wider transition-all duration-200';

    botao.addEventListener('click', () => {
        tagSelecionada = valor;
        atualizarFiltros();
    });

    filtrosTags.appendChild(botao);
}

// Atualiza a aparência dos filtros e os produtos visíveis
function atualizarFiltros() {
    const botoes = filtrosTags.querySelectorAll('button');

    botoes.forEach(botao => {
        const selecionado = botao.dataset.tag === tagSelecionada;

        botao.classList.toggle('bg-[#FF5A3C]', selecionado);
        botao.classList.toggle('text-white', selecionado);
        botao.classList.toggle('border-[#FF5A3C]', selecionado);

        botao.classList.toggle('bg-white', !selecionado);
        botao.classList.toggle('text-stone-700', !selecionado);
        botao.classList.toggle('border-stone-200', !selecionado);
        botao.classList.toggle('hover:border-[#FF5A3C]', !selecionado);

        botao.setAttribute('aria-pressed', String(selecionado));
    });

    const cards = grid.querySelectorAll('[data-tags]');
    let quantidadeVisivel = 0;

    cards.forEach(card => {
        const tags = JSON.parse(card.dataset.tags);

        const mostrar =
            tagSelecionada === 'todas' ||
            tags.some(tag => normalizarTag(tag) === tagSelecionada);

        card.classList.toggle('hidden', !mostrar);

        if (mostrar) {
            quantidadeVisivel++;
        }
    });

    contadorProdutos.textContent =
        `${quantidadeVisivel} product(s) found`;

    contadorProdutos.className = 'mt-4 text-sm font-mono text-stone-500 col-span-full mb-4';

    let mensagem = document.getElementById('no-results');

    if (quantidadeVisivel === 0) {
        if (!mensagem) {
            mensagem = document.createElement('p');
            mensagem.id = 'no-results';
            mensagem.className =
                'text-stone-500 text-sm col-span-full text-center py-8';
            mensagem.textContent =
                'No products found in this category.';
            grid.appendChild(mensagem);
        }
    } else if (mensagem) {
        mensagem.remove();
    }
}

async function carregarProdutosDoServidor() {
    try {
        const resposta = await fetch(URL_API);

        if (!resposta.ok) {
            throw new Error(`HTTP Error: ${resposta.status}`);
        }

        const dados = await resposta.json();

        grid.innerHTML = '';
        filtrosTags.innerHTML = '';

        if (!dados.produtos) {
            throw new Error('The API did not return the list of products.');
        }

        // Descobre todas as tags existentes
        const produtos = Object.entries(dados.produtos);

        const todasTags = new Map();

        produtos.forEach(([id, produto]) => {
            obterTags(produto).forEach(tag => {
                const valor = normalizarTag(tag);

                if (valor) {
                    todasTags.set(valor, tag);
                }
            });
        });

        // Cria o filtro "Todas"
        criarBotaoTag('All', 'todas');

        // Cria um botão para cada tag única
        [...todasTags.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
            .forEach(([valor, nome]) => {
                criarBotaoTag(nome, valor);
            });

        // Cria os cards dos produtos
        produtos.forEach(([id, produto]) => {
            const card = criarCardProduto(produto);
            const tags = obterTags(produto);

            card.dataset.tags = JSON.stringify(tags);
            card.href = `${URL_SERVIDOR}/produto?id=${id}`;

            grid.appendChild(card);
        });

        atualizarFiltros();
    
    } catch (erro) {
        console.error('failed to load products:', erro);

        filtrosTags.innerHTML = '';

        grid.innerHTML = `
            <p class="text-stone-500 font-mono text-xs
                      col-span-full text-center py-8">
                It was not possible to load the products from the server. Please try again later.
            </p>
        `;

        contadorProdutos.textContent = '';
    }
}


// Carrega os produtos assim que o script é executado
carregarProdutosDoServidor();
