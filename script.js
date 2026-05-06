// --- 1. NAVEGAÇÃO ---
window.showScreen = function(id) {
    console.log("Tentando abrir a tela:", id);
    const screens = document.querySelectorAll('.screen');
    const target = document.getElementById(id);
    
    if (!target) {
        alert("ERRO CRÍTICO: Você tentou abrir a tela '" + id + "', mas esse ID não existe no seu HTML!");
        return;
    }

    screens.forEach(s => s.classList.add('hidden'));
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.switchTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const targetTab = document.getElementById('tab-' + tab);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById('btn-tab-' + tab);
    if (targetBtn) targetBtn.classList.add('active');
};

window.navegarMembro = function(abaId) {
    document.querySelectorAll('.tab-content-membro').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tabs-membro button').forEach(btn => btn.classList.remove('active'));
    const targetContent = document.getElementById('tab-m-' + abaId);
    const targetBtn = document.getElementById('btn-m-' + abaId);
    if (targetContent) targetContent.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('active');
};

// --- 2. VARIÁVEIS GLOBAIS ---
let membrosAprovados = [];
let avisosGerais = [];
let itensGestao = [];
let usuarioLogado = null;

// --- 3. SINCRONIZAÇÃO FIREBASE ---
function inicializarApp() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;

    // Membros Ativos
    onValue(ref(window.db, 'membros'), (snapshot) => {
        const data = snapshot.val();
        membrosAprovados = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        atualizarListaPessoas();
        if (usuarioLogado) {
            const eu = membrosAprovados.find(m => m.id === usuarioLogado.id);
            if (eu) { usuarioLogado = eu; atualizarInterfaceMembro(eu); }
        }
    });

    // Pendentes
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
                        <button class="btn-save" style="padding: 5px 15px; width:auto; margin:0;" onclick="aprovarMembroFirebase('${id}')">Aprovar</button>
                    </div>`;
            });
        }
    });

    // Avisos
    onValue(ref(window.db, 'avisos'), (snapshot) => {
        const data = snapshot.val();
        avisosGerais = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : [];
        atualizarQuadroAvisos();
    });

    // Gestão e Grupos
    onValue(ref(window.db, 'gestao'), (snapshot) => {
        const data = snapshot.val();
        itensGestao = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        atualizarAreaMembroGestao();
    });
}

// --- 4. LOGINS ---
window.checkAdmin = function() {
    const e = document.getElementById('admin-email')?.value.trim();
    const p = document.getElementById('admin-pass')?.value;
    
    if (e === "wellison20111@gmail.com" && p === "291220") {
        window.showScreen('admin-dashboard');
    } else { 
        alert('E-mail ou senha de administrador incorretos!'); 
    }
};

window.loginMembro = function() {
    const e = document.getElementById('member-email')?.value.trim();
    const p = document.getElementById('member-pass')?.value;
    const m = membrosAprovados.find(u => u.email === e && u.senha === p);
    if (m) {
        usuarioLogado = m;
        atualizarInterfaceMembro(m);
        if(document.getElementById('edit-nome')) document.getElementById('edit-nome').value = m.nome;
        if(document.getElementById('edit-tel')) document.getElementById('edit-tel').value = m.telefone;
        window.showScreen('member-profile');
    } else {
        alert('Acesso negado: Dados incorretos ou cadastro pendente.');
    }
};

// --- 5. CADASTRO ---
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
            batizado: document.getElementById('reg-batizado').value,
            nascimento: document.getElementById('reg-nascimento').value,
            telefone: document.getElementById('reg-tel').value,
            foto: fotoPreview.length > 10 ? fotoPreview : "",
            status: "Pendente",
            anoInicio: new Date().getFullYear(),
            anoFim: new Date().getFullYear() + 2
        };
        
        window.dbRefs.push(window.dbRefs.ref(window.db, 'pendentes'), dados);
        alert('Cadastro enviado para aprovação!');
        e.target.reset();
        document.getElementById('reg-avatar-preview').style.backgroundImage = "";
        window.showScreen('home-screen');
    }
});

// --- 6. FUNÇÕES ADM (EDIÇÃO E REMOÇÃO DE MEMBROS) ---
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
    if(confirm("Remover membro permanentemente?")) {
        window.dbRefs.remove(window.dbRefs.ref(window.db, `membros/${id}`));
    }
};

window.abrirModalEdicao = function(id) {
    const m = membrosAprovados.find(u => u.id === id);
    if (!m) return;
    
    document.getElementById('edit-membro-id').value = id;
    document.getElementById('input-edit-nome').value = m.nome;
    document.getElementById('input-edit-cargo').value = m.cargo;
    document.getElementById('input-edit-validade').value = m.anoFim || (new Date().getFullYear() + 2);
    
    document.getElementById('modal-edicao').classList.remove('hidden');
};

window.fecharModalEdicao = function() {
    document.getElementById('modal-edicao').classList.add('hidden');
};

window.salvarEdicaoMembro = function() {
    const id = document.getElementById('edit-membro-id').value;
    const novoNome = document.getElementById('input-edit-nome').value;
    const novoCargo = document.getElementById('input-edit-cargo').value;
    const novaValidade = document.getElementById('input-edit-validade').value;

    if (!novoNome) return alert("O nome não pode estar vazio.");

    const { ref, update } = window.dbRefs;
    update(ref(window.db, `membros/${id}`), {
        nome: novoNome,
        cargo: novoCargo,
        anoFim: parseInt(novaValidade)
    }).then(() => {
        alert("Dados atualizados!");
        fecharModalEdicao();
    }).catch(err => {
        console.error(err);
        alert("Erro ao salvar.");
    });
};

// --- 7. MURAL E GESTÃO (DEPARTAMENTOS/GRUPOS) ---
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
        texto, midia, data: new Date().toLocaleDateString('pt-BR') 
    });
    alert("Postado!");
    document.getElementById('texto-aviso').value = "";
}

window.limparMural = function() {
    if(confirm("Apagar todos os avisos?")) window.dbRefs.remove(window.dbRefs.ref(window.db, 'avisos'));
};

window.salvarGestao = function() {
    const tipo = document.getElementById('gestao-tipo').value;
    const nome = document.getElementById('gestao-nome').value;
    const info = document.getElementById('gestao-info').value;
    window.dbRefs.push(window.dbRefs.ref(window.db, 'gestao'), { tipo, nome, info });
    alert("Adicionado!");
    document.getElementById('gestao-nome').value = "";
    document.getElementById('gestao-info').value = "";
};

// --- NOVA FUNÇÃO: REMOVER DEPARTAMENTO OU GRUPO ---
window.removerGestao = function(id) {
    if(confirm("Deseja excluir este item permanentemente?")) {
        const { ref, remove } = window.dbRefs;
        remove(ref(window.db, `gestao/${id}`))
            .then(() => alert("Item removido!"))
            .catch((err) => alert("Erro ao remover: " + err));
    }
};

// --- 8. ATUALIZADORES DE UI ---
function atualizarInterfaceMembro(m) {
    if(document.getElementById('welcome-nome')) document.getElementById('welcome-nome').innerText = m.nome;
    if(document.getElementById('card-nome')) document.getElementById('card-nome').innerText = `${m.nome} ${m.sobrenome}`;
    if(document.getElementById('card-cargo-display')) document.getElementById('card-cargo-display').innerText = m.cargo;
    
    if(document.getElementById('card-validade')) {
        document.getElementById('card-validade').innerText = m.anoFim || (new Date().getFullYear() + 2);
    }
    
    const picCard = document.getElementById('card-foto-display');
    const picEdit = document.getElementById('edit-avatar-preview');
    if (m.foto) {
        const url = `url(${m.foto})`;
        if(picCard) picCard.style.backgroundImage = url;
        if(picEdit) { picEdit.style.backgroundImage = url; picEdit.innerHTML = ''; }
    }
}

function atualizarListaPessoas() {
    const listaAdm = document.getElementById('lista-pessoas-aprovadas');
    if (listaAdm) {
        listaAdm.innerHTML = membrosAprovados.map(m => `
            <li class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
                <span>${m.nome} (${m.cargo})</span>
                <div>
                    <button onclick="abrirModalEdicao('${m.id}')">✏️</button>
                    <button onclick="removerMembro('${m.id}')" style="color:red;">🗑️</button>
                </div>
            </li>`).join('');
    }

    const listaPublica = document.getElementById('ul-membros-comunidade');
    if (listaPublica) {
        listaPublica.innerHTML = membrosAprovados.map(m => `
            <li style="padding:10px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px;">
                <div style="width:35px; height:35px; border-radius:50%; background-image:url(${m.foto || ''}); background-size:cover; background-position:center;"></div>
                <div><strong>${m.nome}</strong><br><small>${m.cargo}</small></div>
            </li>`).join('');
    }
}

function atualizarQuadroAvisos() {
    const container = document.getElementById('quadro-avisos-membro');
    if(!container) return;
    container.innerHTML = avisosGerais.map(a => `
        <div class="card" style="margin-bottom:15px; padding:15px;">
            <p>${a.texto}</p>
            ${a.midia ? `<img src="${a.midia}" style="max-width:100%; border-radius:10px;">` : ""}
            <small>${a.data}</small>
        </div>`).join('');
}

function atualizarAreaMembroGestao() {
    const dL = document.getElementById('lista-deptos-membro');
    const zL = document.getElementById('lista-zaps-membro');
    const listaGestaoAdm = document.getElementById('lista-gestao-adm'); // Para o administrador apagar

    if(dL) dL.innerHTML = ""; 
    if(zL) zL.innerHTML = "";
    if(listaGestaoAdm) listaGestaoAdm.innerHTML = "";

    itensGestao.forEach(i => {
        // Renderiza para o Membro
        if (i.tipo === 'depto') {
            if(dL) dL.innerHTML += `<div class="card"><strong>${i.nome}</strong><p>${i.info}</p></div>`;
        } else {
            if(zL) zL.innerHTML += `<a href="${i.info}" target="_blank" class="btn-member" style="display:block; background:#25d366; color:white; text-align:center; padding:10px; margin-bottom:5px; text-decoration:none; border-radius:5px;">🟢 Grupo: ${i.nome}</a>`;
        }

        // Renderiza para o Administrador (com lixeira)
        if(listaGestaoAdm) {
            listaGestaoAdm.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
                    <div>
                        <strong>${i.tipo === 'depto' ? '🏢' : '🔗'} ${i.nome}</strong>
                    </div>
                    <button onclick="removerGestao('${i.id}')" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem;">🗑️</button>
                </div>
            `;
        }
    });
}

// --- 9. FOTOS ---
window.previewRegPhoto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('reg-avatar-preview');
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.innerHTML = '';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.previewEditPhoto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('edit-avatar-preview').style.backgroundImage = `url(${e.target.result})`;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.salvarAlteracoesPerfil = function() {
    if (!usuarioLogado) return;
    const n = document.getElementById('edit-nome').value;
    const t = document.getElementById('edit-tel').value;
    let f = document.getElementById('edit-avatar-preview').style.backgroundImage;
    f = f.replace('url("', '').replace('")', '');

    const { ref, update } = window.dbRefs;
    update(ref(window.db, `membros/${usuarioLogado.id}`), {
        nome: n, telefone: t, foto: f.length > 10 ? f : usuarioLogado.foto
    }).then(() => alert("Perfil Salvo!"));
};

// --- 10. INICIALIZAÇÃO ---
const checkDb = setInterval(() => { 
    if (window.db && window.dbRefs) { inicializarApp(); clearInterval(checkDb); } 
}, 500);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Erro SW:', err));
    });
}