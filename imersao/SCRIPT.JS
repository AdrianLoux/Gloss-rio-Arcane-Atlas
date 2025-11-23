// --- CONFIGURAÇÃO INICIAL ---
const categoryFiles = [
  {file: 'classes.json', label: 'Classes'},
  {file: 'racas.json', label: 'Raças'},
  {file: 'armas.json', label: 'Armas'},
  {file: 'magias.json', label: 'Magias'},
  {file: 'criaturas.json', label: 'Criaturas'},
  {file: 'itens.json', label: 'Itens'},
  {file: 'atributos.json', label: 'Atributos'},
  {file: 'regioes.json', label: 'Regiões'},
  {file: 'npcs.json', label: 'NPCs'},
  {file: 'lore.json', label: 'Lore'},
  {file: 'fichas.json', label: 'Fichas'}
];

// --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
const cardContainer = document.querySelector('.card-container');
const searchInput = document.querySelector('#searchInput');
const searchButton = document.querySelector('#searchButton');
const categorySelect = document.querySelector('#categorySelect');
const filtersNav = document.querySelector('#filters');

// --- VARIÁVEIS GLOBAIS ---
let allItems = []; // Armazena todos os itens carregados dos arquivos JSON.

/**
 * Função principal de inicialização.
 * Carrega os dados, popula os seletores e renderiza os cards iniciais.
 */
async function inicializar(){
  // Popula o seletor de categorias com base na configuração.
  for(const c of categoryFiles){
    const opt = document.createElement('option');
    opt.value = c.file;
    opt.textContent = c.label;
    categorySelect.appendChild(opt);
  }

  // Busca o conteúdo de todos os arquivos JSON de forma assíncrona.
  const fetches = categoryFiles.map(async c => {
    try{
      const res = await fetch(c.file);
      const json = await res.json();
      // Normaliza os dados: garante que sempre seja um array.
      if(Array.isArray(json)){
        // Adiciona a categoria e a origem do arquivo a cada item.
        return json.map(item => ({...item, categoria: c.label, __source: c.file}));
      } else {
        const arr = [];
        for(const key of Object.keys(json)){
          if(Array.isArray(json[key])){
            arr.push(...json[key].map(it => ({...it, categoria: c.label, __source: c.file})));
          }
        }
        return arr;
      }
    }catch(e){
      console.error('Falha ao carregar', c.file, e);
      return [];
    }
  });

  const results = await Promise.all(fetches);
  allItems = results.flat();

  // Gera os botões de filtro com base nas tags encontradas.
  generateFilterButtons();

  // Renderiza todos os cards na tela.
  renderizarCards(allItems);
}

/**
 * Renderiza uma lista de itens como cards no container principal.
 * @param {Array} items - O array de itens a serem renderizados.
 */
function renderizarCards(items){
  cardContainer.innerHTML = '';
  if(items.length === 0){
    cardContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
    return;
  }

  for(const it of items){
    const card = document.createElement('article');
    card.className = 'card';
    const title = it.nome || it.titulo || 'Sem nome';
      let iconHTML = '';
  if(it.icone){
    iconHTML = `<img class="card-icon" src="${it.icone}" alt="${title}">`;
  }
    const desc = it.descricao ? it.descricao : (it.efeito ? it.efeito : '');
    const meta = it.categoria || it.__source;
    // Gera badges a partir das tags do item.
    let badges = '';
    if(it.tags && Array.isArray(it.tags)){
      badges = it.tags.map(t=>`<span class="badge">${t}</span>`).join(' ');
    } else if(it.categoria){
      badges = `<span class="badge">${it.categoria}</span>`;
    }
    card.innerHTML = `
      <h2>${title}</h2>
      <div class="meta">${meta} ${it.nivel ? `· Nível ${it.nivel}` : ''}${it.nivel_min ? `· Nível mín: ${it.nivel_min}` : ''}</div>
      <div>${badges}</div>
      <p>${desc}</p>
      ${renderExtra(it)}
    `;
    cardContainer.appendChild(card);
  }
}

/**
 * Renderiza informações extras para tipos específicos de cards.
 * @param {Object} it - O item do card.
 * @returns {string} HTML com os detalhes extras.
 */
function renderExtra(it){
  if(it.__source === 'armas.json'){
    return `<p><strong>Dano:</strong> ${it.dano || '-'} · <strong>Tipo:</strong> ${it.tipo || '-'}</p>`;
  }
  if(it.__source === 'magias.json'){
    return `<p><strong>Custo:</strong> ${it.custo_mana || '-'} · <strong>Efeito:</strong> ${it.efeito || '-'}</p>`;
  }
  if(it.__source === 'fichas.json'){
    const attrs = it.atributos ? Object.entries(it.atributos).map(([k,v])=>k+':'+v).join(' · ') : '';
    return `<p><strong>Classe:</strong> ${it.classe || '-'} · <strong>Raça:</strong> ${it.raça || '-'}<br><strong>Atributos:</strong> ${attrs}</p>`;
  }
  if(it.__source === 'racas.json'){
    const bonus = it.atributos_bonus ? JSON.stringify(it.atributos_bonus) : '';
    return `<p><strong>Bônus:</strong> ${bonus}</p>`;
  }
  if(it.__source === 'regioes.json'){
    const perigos = it.perigos ? it.perigos.join(', ') : '-';
    return `<p><strong>Perigos:</strong> ${perigos}</p>`;
  }
  return '';
}

/**
 * Filtra os itens com base no termo de busca e na categoria selecionada,
 * e depois chama a função de renderização.
 */
function handleSearch(){
  const termo = (searchInput.value || '').toLowerCase().trim();
  const categoriaFile = categorySelect.value;
  let items = allItems.slice();

  // Filtra por categoria, se uma for selecionada.
  if(categoriaFile !== 'all'){
    items = items.filter(i => i.__source === categoriaFile);
  }
  if(termo){
    // Filtra pelo termo de busca no nome, descrição ou tags.
    items = items.filter(i => {
      const name = (i.nome || i.titulo || '').toString().toLowerCase();
      const desc = (i.descricao || i.efeito || '').toString().toLowerCase();
      const tags = (i.tags||[]).join(' ').toLowerCase();
      return name.includes(termo) || desc.includes(termo) || tags.includes(termo);
    });
  }
  renderizarCards(items);
}

// --- EVENT LISTENERS ---
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e)=>{ if(e.key === 'Enter') handleSearch(); });

/**
 * Gera botões de filtro dinamicamente a partir de todas as tags
 * encontradas nos itens carregados.
 */
function generateFilterButtons(){
  const tagSet = new Set();
  allItems.forEach(i=>{
    if(Array.isArray(i.tags)) i.tags.forEach(t=>tagSet.add(t));
  });
  const tags = Array.from(tagSet).sort();

  // Limpa os filtros existentes e adiciona o botão "Todos".
  filtersNav.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn';
  allBtn.textContent = 'Todos';
  allBtn.onclick = ()=>{ searchInput.value=''; categorySelect.value='all'; renderizarCards(allItems); };
  filtersNav.appendChild(allBtn);
  tags.forEach(t=>{
    // Cria um botão para cada tag.
    const b = document.createElement('button');
    b.className = 'filter-btn';
    b.textContent = t;
    b.onclick = ()=> {
      searchInput.value = t;
      categorySelect.value = 'all';
      handleSearch();
    };
    filtersNav.appendChild(b);
  });
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
inicializar();
