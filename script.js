// Banco de dados no navegador
let membrosAprovados = JSON.parse(localStorage.getItem('membrosIgreja')) || [];
let avisosGerais = JSON.parse(localStorage.getItem('avisosIgreja')) || [];
let configsIgreja = JSON.parse(localStorage.getItem('configsIgreja')) || { grupos: "", depto: "" };
let usuarioLogado = null;

// --- FUNÇÕES DE IMAGEM ---
function previewImage(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = ''; // Limpa o texto "Foto"
        }
        reader.readAsDataURL(file);
    }
}

// --- NAVEGAÇÃO ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    
    if(screenId === 'admin-dashboard') {
        atualizarListaPessoas();
        carregarConfiguracoesADM();
    }
}

// --- SISTEMA DE LOGIN ---
function checkAdmin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    // Credenciais conforme solicitado anteriormente
    if(email === "wellison20111@gmail.com" && pass === "291220") {
        showScreen('admin-dashboard');
    } else {
        alert('E-mail ou senha de administrador incorretos!');
    }
}

function loginMembro() {
    const email = document.getElementById('member-email').value;
    const pass = document.getElementById('member-pass').value;
    const membro = membrosAprovados.find(m => m.email === email && m.senha === pass);

    if(membro) {
        usuarioLogado = membro;
        preencherDadosMembro();
        atualizarQuadroAvisos();
        carregarInfosIgrejaNoMembro();
        atualizarListaComunidade();
        showScreen('member-profile');
    } else {
        alert('Membro não encontrado ou ainda não aprovado!');
    }
}

// --- CADASTRO E APROVAÇÃO ---
document.getElementById('registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const batismoStatus = document.querySelector('input[name="batismo"]:checked').value;
    const fotoData = document.getElementById('reg-avatar-preview').style.backgroundImage;
    
    const novoCadastro = {
        nome: document.getElementById('reg-nome').value,
        sobrenome: document.getElementById('reg-sobrenome').value,
        email: document.getElementById('reg-email').value,
        senha: document.getElementById('reg-pass').value,
        cargo: document.getElementById('reg-cargo').value,
        nascimento: document.getElementById('reg-nascimento').value,
        telefone: document.getElementById('reg-tel').value,
        batizado: batismoStatus,
        foto: fotoData,
        dataBatismo: batismoStatus === "Sim" ? document.getElementById('reg-data-batismo').value : ""
    };

    solicitarAprovacao(novoCadastro);
    alert('Cadastro enviado! Peça ao ADM para aprovar.');
    showScreen('home-screen');
});

function solicitarAprovacao(dados) {
    const listaAprovacao = document.getElementById('pending-list');
    if (!listaAprovacao) return;

    const novoItem = document.createElement('div');
    novoItem.className = 'member-card';
    novoItem.style = "background: #f0f0f0; padding: 10px; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;";
    
    // Preparar os dados para o clique do botão evitando problemas com aspas
    const dadosString = JSON.stringify(dados).replace(/"/g, '&quot;');

    novoItem.innerHTML = `
        <span><strong>${dados.nome}</strong> (${dados.cargo})</span>
        <button class="btn-approve" style="background: green; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;" 
        onclick="aprovarMembro(${dadosString}, this)">Aprovar</button>
    `;
    listaAprovacao.appendChild(novoItem);
}

function aprovarMembro(dados, botao) {
    membrosAprovados.push(dados);
    localStorage.setItem('membrosIgreja', JSON.stringify(membrosAprovados));
    atualizarListaPessoas();
    if (botao && botao.parentElement) {
        botao.parentElement.remove();
    }
    alert(dados.nome + ' aprovado com sucesso!');
}

// --- FUNÇÕES ADM ---
function atualizarListaPessoas() {
    const listaPessoas = document.getElementById('lista-pessoas-aprovadas');
    if(!listaPessoas) return;
    listaPessoas.innerHTML = "";
    
    membrosAprovados.forEach((membro, index) => {
        const item = document.createElement('li');
        item.style = "display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;";
        item.innerHTML = `
            <span>${membro.nome} ${membro.sobrenome || ""} - <strong>${membro.cargo}</strong></span>
            <button onclick="removerMembro(${index})" style="background: red; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 8px;">Excluir</button>
        `;
        listaPessoas.appendChild(item);
    });
}

function removerMembro(index) {
    if(confirm("Tem certeza que deseja excluir este membro?")) {
        membrosAprovados.splice(index, 1);
        localStorage.setItem('membrosIgreja', JSON.stringify(membrosAprovados));
        atualizarListaPessoas();
    }
}

function salvarInfoIgreja(tipo) {
    if(tipo === 'grupos') {
        configsIgreja.grupos = document.getElementById('texto-grupos').value;
    } else {
        configsIgreja.depto = document.getElementById('texto-depto').value;
    }
    localStorage.setItem('configsIgreja', JSON.stringify(configsIgreja));
    alert("Informações atualizadas!");
}

function carregarConfiguracoesADM() {
    const inputGrupos = document.getElementById('texto-grupos');
    const inputDepto = document.getElementById('texto-depto');
    if(inputGrupos) inputGrupos.value = configsIgreja.grupos;
    if(inputDepto) inputDepto.value = configsIgreja.depto;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tab);
    const targetBtn = document.getElementById('btn-tab-' + tab);
    
    if(targetTab) targetTab.classList.remove('hidden');
    if(targetBtn) targetBtn.classList.add('active');
}

// --- FUNÇÕES MEMBRO ---
function preencherDadosMembro() {
    if(!usuarioLogado) return;

    document.getElementById('card-nome').innerText = `${usuarioLogado.nome} ${usuarioLogado.sobrenome || ""}`;
    document.getElementById('card-cargo').innerText = usuarioLogado.cargo;
    
    // Foto na carteirinha
    const cardFoto = document.getElementById('card-foto-display');
    if(usuarioLogado.foto && cardFoto) {
        cardFoto.style.backgroundImage = usuarioLogado.foto;
        cardFoto.style.backgroundSize = 'cover';
        cardFoto.style.backgroundPosition = 'center';
    }

    // Dados na aba edição
    const editNome = document.getElementById('edit-nome');
    const editTel = document.getElementById('edit-tel');
    const editPass = document.getElementById('edit-pass');
    
    if(editNome) editNome.value = usuarioLogado.nome;
    if(editTel) editTel.value = usuarioLogado.telefone || "";
    if(editPass) editPass.value = usuarioLogado.senha;
    
    // Preview da foto na aba edição
    const editPreview = document.getElementById('edit-avatar-preview');
    if(usuarioLogado.foto && editPreview) {
        editPreview.style.backgroundImage = usuarioLogado.foto;
        editPreview.style.backgroundSize = 'cover';
        editPreview.style.backgroundPosition = 'center';
        editPreview.innerHTML = '';
    }
}

function salvarProprioPerfil() {
    const index = membrosAprovados.findIndex(m => m.email === usuarioLogado.email);
    if(index !== -1) {
        const novaFoto = document.getElementById('edit-avatar-preview').style.backgroundImage;
        membrosAprovados[index].nome = document.getElementById('edit-nome').value;
        membrosAprovados[index].telefone = document.getElementById('edit-tel').value;
        membrosAprovados[index].senha = document.getElementById('edit-pass').value;
        membrosAprovados[index].foto = novaFoto;
        
        localStorage.setItem('membrosIgreja', JSON.stringify(membrosAprovados));
        usuarioLogado = membrosAprovados[index];
        preencherDadosMembro();
        alert("Seus dados foram atualizados!");
    }
}

function carregarInfosIgrejaNoMembro() {
    const verGrupos = document.getElementById('ver-grupos');
    const verDepto = document.getElementById('ver-depto');
    if(verGrupos) verGrupos.innerText = configsIgreja.grupos || "Nenhum link cadastrado.";
    if(verDepto) verDepto.innerText = configsIgreja.depto || "Nenhum departamento listado.";
}

function atualizarListaComunidade() {
    const lista = document.getElementById('lista-membros-comunidade');
    if(!lista) return;
    lista.innerHTML = membrosAprovados.map(m => `
        <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background-image: ${m.foto || 'none'}; background-color: #ddd; background-size: cover; background-position: center;"></div>
            <span><strong>${m.nome}</strong> - ${m.cargo}</span>
        </li>
    `).join('');
}

function switchMemberTab(tab) {
    document.querySelectorAll('.member-sub-tab').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('#member-profile .tabs button').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById('sub-tab-' + tab);
    const targetBtn = document.getElementById('btn-tab-' + tab);
    
    if(targetTab) targetTab.classList.remove('hidden');
    if(targetBtn) targetBtn.classList.add('active');
}

// --- AVISOS ---
function enviarAviso() {
    const inputAviso = document.getElementById('texto-aviso');
    if(!inputAviso) return;
    
    const texto = inputAviso.value;
    if(texto.trim() === "") return alert("Digite um aviso!");
    
    const novoAviso = { texto, data: new Date().toLocaleDateString('pt-BR') };
    avisosGerais.unshift(novoAviso);
    localStorage.setItem('avisosIgreja', JSON.stringify(avisosGerais));
    inputAviso.value = "";
    alert("Aviso publicado!");
    atualizarQuadroAvisos();
}

function atualizarQuadroAvisos() {
    const container = document.getElementById('quadro-avisos-membro');
    if(!container) return;
    
    if(avisosGerais.length === 0) {
        container.innerHTML = "<p>Nenhum aviso importante hoje.</p>";
        return;
    }
    
    container.innerHTML = avisosGerais.map(aviso => `
        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <small style="color: #888;">${aviso.data}</small>
            <p style="margin: 5px 0;">${aviso.texto}</p>
        </div>
    `).join('');
}

// --- PWA ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('Service Worker registrado!', reg))
    .catch(err => console.log('Erro no SW', err));
}