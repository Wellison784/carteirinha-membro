// --- CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE ---
const { ref, push, onValue, set, remove } = window.dbRefs;

// Variáveis de Estado (Sincronizadas com a Nuvem)
let membrosAprovados = [];
let avisosGerais = [];
let configsIgreja = { grupos: "", depto: "" };
let usuarioLogado = null;
let midiaAvisoBase64 = "";

// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
function inicializarApp() {
    // Escutar Membros Aprovados (Real-time)
    onValue(ref(window.db, 'membros'), (snapshot) => {
        const data = snapshot.val();
        membrosAprovados = data ? Object.values(data) : [];
        atualizarListaPessoas(); // Painel ADM
        atualizarListaComunidade(); // Painel Membro
    });

    // Escutar Membros Pendentes (Apenas para o ADM ver)
    onValue(ref(window.db, 'pendentes'), (snapshot) => {
        const listaAprovacao = document.getElementById('pending-list');
        if (!listaAprovacao) return;
        listaAprovacao.innerHTML = "";
        
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(id => {
                const dados = data[id];
                const novoItem = document.createElement('div');
                novoItem.className = 'member-card';
                novoItem.style = "background: #f0f0f0; padding: 10px; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;";
                novoItem.innerHTML = `
                    <span><strong>${dados.nome}</strong> (${dados.cargo})</span>
                    <button style="background: green; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;" 
                    onclick="aprovarMembroFirebase('${id}')">Aprovar</button>
                `;
                listaAprovacao.appendChild(novoItem);
            });
        }
    });

    // Escutar Avisos (Real-time)
    onValue(ref(window.db, 'avisos'), (snapshot) => {
        const data = snapshot.val();
        // Converte o objeto do Firebase em array e inverte para o mais novo aparecer primeiro
        avisosGerais = data ? Object.values(data).reverse() : [];
        atualizarQuadroAvisosADM();
        atualizarQuadroAvisos();
    });
}

// Rodar a inicialização
inicializarApp();

// --- FUNÇÕES DE IMAGEM E MÍDIA ---
function previewImage(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';
        }
        reader.readAsDataURL(file);
    }
}

function previewAvisoMidia(input) {
    const container = document.getElementById('preview-midia-container');
    container.innerHTML = "";
    midiaAvisoBase64 = "";

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        const file = input.files[0];
        reader.onload = (e) => {
            midiaAvisoBase64 = e.target.result;
            if (file.type.includes('image')) {
                container.innerHTML = `<img src="${midiaAvisoBase64}" style="width:100%; border-radius:8px; margin-top:10px;">`;
            } else if (file.type.includes('video')) {
                container.innerHTML = `<video src="${midiaAvisoBase64}" controls style="width:100%; border-radius:8px; margin-top:10px;"></video>`;
            }
        };
        reader.readAsDataURL(file);
    }
}

// --- NAVEGAÇÃO ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.getElementById('btn-tab-' + tab).classList.add('active');
}

function switchMemberTab(tab) {
    document.querySelectorAll('.member-sub-tab').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('#member-profile .tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('sub-tab-' + tab).classList.remove('hidden');
    document.getElementById('btn-tab-' + tab).classList.add('active');
}

// --- SISTEMA DE ACESSO ---
function checkAdmin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
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
        showScreen('member-profile');
    } else {
        alert('Membro não encontrado ou ainda não aprovado!');
    }
}

// --- CADASTRO E APROVAÇÃO ---
document.getElementById('registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fotoData = document.getElementById('reg-avatar-preview').style.backgroundImage;
    
    const novoCadastro = {
        nome: document.getElementById('reg-nome').value,
        sobrenome: document.getElementById('reg-sobrenome').value,
        email: document.getElementById('reg-email').value,
        senha: document.getElementById('reg-pass').value,
        cargo: document.getElementById('reg-cargo').value,
        nascimento: document.getElementById('reg-nascimento').value,
        telefone: document.getElementById('reg-tel').value,
        foto: fotoData || ""
    };

    // Envia para o Firebase no nó de "pendentes"
    push(ref(window.db, 'pendentes'), novoCadastro);
    alert('Cadastro enviado! Peça ao Wellison para aprovar no celular dele.');
    showScreen('home-screen');
});

function aprovarMembroFirebase(id) {
    const pendenteRef = ref(window.db, `pendentes/${id}`);
    
    // Busca os dados uma única vez para mover de pasta
    onValue(pendenteRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            push(ref(window.db, 'membros'), dados); // Adiciona aos aprovados
            remove(pendenteRef); // Remove dos pendentes
            alert('Membro aprovado e sincronizado!');
        }
    }, { onlyOnce: true });
}

// --- FUNÇÕES DE INTERFACE DO MEMBRO ---
function preencherDadosMembro() {
    if(!usuarioLogado) return;
    document.getElementById('card-nome').innerText = `${usuarioLogado.nome} ${usuarioLogado.sobrenome || ""}`;
    document.getElementById('card-cargo').innerText = usuarioLogado.cargo;
    
    const cardFoto = document.getElementById('card-foto-display');
    if(usuarioLogado.foto && cardFoto) {
        cardFoto.style.backgroundImage = usuarioLogado.foto;
        cardFoto.style.backgroundSize = 'cover';
    }
}

function atualizarListaComunidade() {
    const lista = document.getElementById('lista-membros-comunidade');
    if(!lista) return;
    lista.innerHTML = membrosAprovados.map(m => `
        <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
            <div style="width: 35px; height: 35px; border-radius: 50%; background-image: ${m.foto || 'none'}; background-color: #ddd; background-size: cover; background-position: center;"></div>
            <span><strong>${m.nome}</strong> - ${m.cargo}</span>
        </li>
    `).join('');
}

// --- GESTÃO DE AVISOS ---
function enviarAviso() {
    const texto = document.getElementById('texto-aviso').value;
    if(!texto && !midiaAvisoBase64) return alert("Escreva algo ou adicione uma foto/vídeo!");

    const novoAviso = {
        texto: texto,
        midia: midiaAvisoBase64,
        data: new Date().toLocaleString('pt-BR')
    };

    push(ref(window.db, 'avisos'), novoAviso);
    
    // Limpar campos
    document.getElementById('texto-aviso').value = "";
    midiaAvisoBase64 = "";
    document.getElementById('preview-midia-container').innerHTML = "";
    alert("Aviso publicado para toda a igreja!");
}

function atualizarQuadroAvisos() {
    const container = document.getElementById('quadro-avisos-membro');
    if(!container) return;
    
    container.innerHTML = avisosGerais.map(aviso => `
        <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
            <small style="color: #888;">${aviso.data}</small>
            <p style="margin: 10px 0; font-size: 1.1em;">${aviso.texto}</p>
            ${aviso.midia ? (aviso.midia.includes('video') ? 
                `<video src="${aviso.midia}" controls style="width:100%; border-radius:8px;"></video>` : 
                `<img src="${aviso.midia}" style="width:100%; border-radius:8px;">`) : ""}
        </div>
    `).join('');
}

function atualizarQuadroAvisosADM() {
    const container = document.getElementById('lista-avisos-adm');
    if(!container) return;
    container.innerHTML = avisosGerais.map((aviso, index) => `
        <div style="background: #fff; padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ddd;">
            <small>${aviso.data}</small>
            <p>${aviso.texto.substring(0, 50)}...</p>
        </div>
    `).join('');
}

function atualizarListaPessoas() {
    const listaPessoas = document.getElementById('lista-pessoas-aprovadas');
    if(!listaPessoas) return;
    listaPessoas.innerHTML = membrosAprovados.map(m => `
        <li style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
            <span>${m.nome} - <strong>${m.cargo}</strong></span>
        </li>
    `).join('');
}

// --- FINALIZAÇÃO: SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('PWA: Service Worker ativo!', reg.scope))
        .catch(err => console.log('PWA: Erro ao registrar SW', err));
    });
}