// --- 1. FUNÇÕES DE NAVEGAÇÃO (PRIORIDADE TOTAL) ---
window.showScreen = function(id) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        console.error("Tela não encontrada: " + id);
    }
};

window.switchTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const targetTab = document.getElementById('tab-' + tab);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById('btn-tab-' + tab);
    if (targetBtn) targetBtn.classList.add('active');
};

// --- 2. PREVIEW DA FOTO NO CADASTRO ---
window.previewRegPhoto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('reg-avatar-preview');
            if(preview) {
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.backgroundSize = 'cover';
                preview.innerHTML = ''; // Remove o ícone de "+"
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// --- 3. VARIÁVEIS GLOBAIS ---
let membrosAprovados = [];
let avisosGerais = [];
let itensGestao = [];
let usuarioLogado = null;

// --- 4. SINCRONIZAÇÃO FIREBASE ---
function inicializarApp() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;

    onValue(ref(window.db, 'membros'), (snapshot) => {
        const data = snapshot.val();
        membrosAprovados = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        atualizarListaPessoas();
    });

    onValue(ref(window.db, 'pendentes'), (snapshot) => {
        const lista = document.getElementById('pending-list');
        if (!lista) return;
        lista.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(id => {
                const d = data[id];
                lista.innerHTML += `
                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding: 10px;">
                        <div><strong>${d.nome} ${d.sobrenome}</strong><br><small>${d.cargo}</small></div>
                        <button class="btn-save" onclick="aprovarMembroFirebase('${id}')">Aprovar</button>
                    </div>`;
            });
        }
    });

    onValue(ref(window.db, 'avisos'), (snapshot) => {
        const data = snapshot.val();
        avisosGerais = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : [];
        atualizarQuadroAvisos();
    });

    onValue(ref(window.db, 'gestao'), (snapshot) => {
        const data = snapshot.val();
        itensGestao = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        atualizarAreaMembroGestao();
    });
}

// Tenta conectar ao banco a cada 500ms até ter sucesso
const checkDb = setInterval(() => { 
    if (window.db && window.dbRefs) { 
        inicializarApp(); 
        clearInterval(checkDb); 
    } 
}, 500);

// --- 5. LOGINS E CADASTRO ---
window.loginMembro = function() {
    const e = document.getElementById('member-email').value.trim();
    const p = document.getElementById('member-pass').value;
    const m = membrosAprovados.find(u => u.email === e && u.senha === p);
    
    if (m) {
        usuarioLogado = m;
        document.getElementById('card-nome').innerText = `${m.nome} ${m.sobrenome}`;
        document.getElementById('card-cargo-display').innerText = m.cargo;
        
        const pic = document.getElementById('card-foto-display');
        if (m.foto && pic) {
            pic.style.backgroundImage = `url(${m.foto})`;
            pic.style.backgroundSize = 'cover';
        }
        window.showScreen('member-profile');
    } else {
        alert('Acesso negado: E-mail ou Senha incorretos ou aguardando aprovação.');
    }
};

window.checkAdmin = function() {
    const e = document.getElementById('admin-email').value.trim();
    const p = document.getElementById('admin-pass').value;
    if (e === "wellison20111@gmail.com" && p === "291220") {
        window.showScreen('admin-dashboard');
    } else {
        alert('Senha de Administrador incorreta!');
    }
};

// Cadastro de Membros
document.addEventListener('submit', function(e) {
    if(e.target && e.target.id === 'registration-form'){
        e.preventDefault();
        let fotoPreview = document.getElementById('reg-avatar-preview').style.backgroundImage;
        fotoPreview = fotoPreview.replace('url("', '').replace('")', '');

        const dados = {
            nome: document.getElementById('reg-nome').value,
            sobrenome: document.getElementById('reg-sobrenome').value,
            email: document.getElementById('reg-email').value.trim(),
            senha: document.getElementById('reg-pass').value,
            cargo: document.getElementById('reg-cargo').value,
            nascimento: document.getElementById('reg-nascimento').value,
            telefone: document.getElementById('reg-tel').value,
            foto: fotoPreview.length > 10 ? fotoPreview : "",
            status: "Pendente"
        };
        
        window.dbRefs.push(window.dbRefs.ref(window.db, 'pendentes'), dados);
        alert('Pedido enviado! Fale com o Pastor para aprovar seu acesso.');
        window.showScreen('home-screen');
    }
});

// --- 6. FUNÇÕES DO PASTOR (ADM) ---
window.aprovarMembroFirebase = function(id) {
    const { ref, set, remove, get } = window.dbRefs;
    get(ref(window.db, `pendentes/${id}`)).then((snap) => {
        const dados = snap.val();
        if (dados) {
            dados.status = "Ativo";
            set(ref(window.db, `membros/${id}`), dados).then(() => {
                remove(ref(window.db, `pendentes/${id}`));
            });
        }
    });
};

window.removerMembro = function(id) {
    if(confirm("Deseja excluir este membro permanentemente?")) {
        window.dbRefs.remove(window.dbRefs.ref(window.db, `membros/${id}`));
    }
};

// --- 7. UTILITÁRIOS ---
window.alterarFotoPerfil = function(input) {
    if (input.files && input.files[0] && usuarioLogado) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const novaFoto = e.target.result;
            window.dbRefs.set(window.dbRefs.ref(window.db, `membros/${usuarioLogado.id}/foto`), novaFoto).then(() => {
                document.getElementById('card-foto-display').style.backgroundImage = `url(${novaFoto})`;
                alert("Foto atualizada com sucesso!");
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.enviarAviso = function() {
    const texto = document.getElementById('texto-aviso').value;
    const midia = document.getElementById('upload-midia').files[0];
    if (midia) {
        const reader = new FileReader();
        reader.onload = (e) => salvarAviso(texto, e.target.result);
        reader.readAsDataURL(midia);
    } else { salvarAviso(texto, ""); }
};

function salvarAviso(texto, midia) {
    window.dbRefs.push(window.dbRefs.ref(window.db, 'avisos'), { 
        texto, 
        midia, 
        data: new Date().toLocaleDateString('pt-BR') 
    });
    alert("Aviso publicado no mural!");
    document.getElementById('texto-aviso').value = "";
}

function atualizarQuadroAvisos() {
    const container = document.getElementById('quadro-avisos-membro');
    if(!container) return;
    container.innerHTML = avisosGerais.map(a => `
        <div class="card" style="margin-bottom:15px; padding:15px;">
            <p style="white-space: pre-wrap;">${a.texto}</p>
            ${a.midia ? `<img src="${a.midia}" style="width:100%; border-radius:8px; margin-top:10px;">` : ""}
            <small style="display:block; margin-top:10px; color:#666;">Postado em: ${a.data}</small>
        </div>`).join('');
}

function atualizarAreaMembroGestao() {
    const dL = document.getElementById('lista-deptos-membro');
    const zL = document.getElementById('lista-zaps-membro');
    if(dL) dL.innerHTML = ""; if(zL) zL.innerHTML = "";
    itensGestao.forEach(i => {
        if (i.tipo === 'depto') {
            if(dL) dL.innerHTML += `<div class="card"><strong>${i.nome}</strong><p>${i.info}</p></div>`;
        } else {
            if(zL) zL.innerHTML += `<a href="${i.info}" target="_blank" class="btn btn-member" style="background:#25d366; color:white; display:block; text-align:center; padding:10px; border-radius:8px; margin-bottom:10px; text-decoration:none;">Grupo: ${i.nome}</a>`;
        }
    });
}

function atualizarListaPessoas() {
    const lista = document.getElementById('lista-pessoas-aprovadas');
    if (lista) {
        lista.innerHTML = membrosAprovados.map(m => `
            <li class="card" style="display:flex; justify-content:space-between; padding:10px; margin-bottom:5px;">
                <span>${m.nome} (${m.cargo})</span>
                <button onclick="removerMembro('${m.id}')" style="color:red; background:none; border:none; cursor:pointer;">Excluir</button>
            </li>`).join('');
    }
}

// --- 8. SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}