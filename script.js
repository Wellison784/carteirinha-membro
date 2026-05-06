// --- 1. FUNÇÕES DE NAVEGAÇÃO ---
window.showScreen = function(id) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
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

// --- 2. VARIÁVEIS GLOBAIS ---
let membrosAprovados = [];
let avisosGerais = [];
let itensGestao = [];
let usuarioLogado = null;

// --- 3. SINCRONIZAÇÃO FIREBASE ---
function inicializarApp() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;

    onValue(ref(window.db, 'membros'), (snapshot) => {
        const data = snapshot.val();
        membrosAprovados = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        atualizarListaPessoas();
        if (usuarioLogado) {
            const eu = membrosAprovados.find(m => m.id === usuarioLogado.id);
            if (eu) { usuarioLogado = eu; atualizarInterfaceMembro(eu); }
        }
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
                        <button class="btn-save" style="padding: 5px 15px; width:auto; margin:0;" onclick="aprovarMembroFirebase('${id}')">Aprovar</button>
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

function atualizarInterfaceMembro(m) {
    document.getElementById('welcome-nome').innerText = m.nome;
    document.getElementById('card-nome').innerText = `${m.nome} ${m.sobrenome}`;
    document.getElementById('card-cargo-display').innerText = m.cargo;
    const validadeEl = document.getElementById('card-validade');
    if (validadeEl) validadeEl.innerText = `${m.anoInicio || '2026'} - ${m.anoFim || '2028'}`;

    // Foto na Carteirinha
    const picCard = document.getElementById('card-foto-display');
    // NOVA LINHA: Foto na área de Edição de Perfil
    const picEdit = document.getElementById('edit-avatar-preview');

    if (m.foto) {
        const fotoUrl = `url(${m.foto})`;
        // Atualiza carteirinha
        picCard.style.backgroundImage = fotoUrl;
        picCard.style.backgroundSize = 'cover';
        picCard.style.backgroundPosition = 'center';

        // NOVA LINHA: Atualiza área de edição
        picEdit.style.backgroundImage = fotoUrl;
        picEdit.style.backgroundSize = 'cover';
        picEdit.style.backgroundPosition = 'center';
        picEdit.innerHTML = '';
    } else {
        // Se não tiver foto, define um padrão ou limpa
        picCard.style.backgroundImage = '';
        picEdit.style.backgroundImage = '';
        picEdit.innerHTML = '<span>+</span>';
    }
}

// Função para atualizar a foto clicando direto na carteirinha
window.atualizarFotoDireto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const novaFotoBase64 = e.target.result;

            // Atualiza a imagem na tela na hora
            document.getElementById('card-foto-display').style.backgroundImage = `url(${novaFotoBase64})`;

            // Salva no banco de dados
            if (window.usuarioLogado && window.usuarioLogado.id) {
                const { ref, set } = window.dbRefs;
                set(ref(window.db, `membros/${window.usuarioLogado.id}/foto`), novaFotoBase64)
                .then(() => alert("Foto atualizada com sucesso!"))
                .catch(() => alert("Erro ao salvar foto no banco."));
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// --- 4. LOGINS E CADASTRO ---
window.loginMembro = function() {
    const e = document.getElementById('member-email').value.trim();
    const p = document.getElementById('member-pass').value;
    const m = membrosAprovados.find(u => u.email === e && u.senha === p);
    if (m) {
        usuarioLogado = m;
        atualizarInterfaceMembro(m);
        document.getElementById('edit-nome').value = m.nome;
        document.getElementById('edit-tel').value = m.telefone;
        window.showScreen('member-profile');
    } else {
        alert('Acesso negado: E-mail/Senha incorretos ou aguardando aprovação.');
    }
};

window.checkAdmin = function() {
    const e = document.getElementById('admin-email').value.trim();
    const p = document.getElementById('admin-pass').value;
    if (e === "wellison20111@gmail.com" && p === "291220") {
        window.showScreen('admin-dashboard');
    } else { alert('Senha incorreta!'); }
};

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
            dataBatismo: document.getElementById('reg-data-batismo').value || "Não informada",
            nascimento: document.getElementById('reg-nascimento').value,
            telefone: document.getElementById('reg-tel').value,
            foto: fotoPreview.length > 10 ? fotoPreview : "",
            status: "Pendente",
            anoInicio: new Date().getFullYear(),
            anoFim: new Date().getFullYear() + 2
        };
        
        window.dbRefs.push(window.dbRefs.ref(window.db, 'pendentes'), dados);
        alert('Cadastro enviado! Aguarde aprovação.');
        e.target.reset();
        document.getElementById('reg-avatar-preview').style.backgroundImage = "";
        window.showScreen('home-screen');
    }
});

// --- 5. FUNÇÕES ADM ---
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
    if(confirm("Remover membro?")) window.dbRefs.remove(window.dbRefs.ref(window.db, `membros/${id}`));
};

window.abrirModalEdicao = function(id) {
    const m = membrosAprovados.find(u => u.id === id);
    if (!m) return;
    document.getElementById('edit-adm-id').value = id;
    document.getElementById('edit-adm-nome').value = m.nome;
    document.getElementById('edit-adm-cargo').value = m.cargo;
    document.getElementById('edit-adm-ano-inicio').value = m.anoInicio || 2026;
    document.getElementById('edit-adm-ano-fim').value = m.anoFim || 2028;
    document.getElementById('modal-edit-membro').classList.remove('hidden');
};

window.fecharModalEdicao = function() {
    document.getElementById('modal-edit-membro').classList.add('hidden');
};

window.salvarEdicaoAdm = function() {
    const id = document.getElementById('edit-adm-id').value;
    const { ref, set } = window.dbRefs;
    const novosDados = {
        nome: document.getElementById('edit-adm-nome').value,
        cargo: document.getElementById('edit-adm-cargo').value,
        anoInicio: document.getElementById('edit-adm-ano-inicio').value,
        anoFim: document.getElementById('edit-adm-ano-fim').value
    };
    Object.keys(novosDados).forEach(key => {
        set(ref(window.db, `membros/${id}/${key}`), novosDados[key]);
    });
    alert("Atualizado!");
    fecharModalEdicao();
};

// --- 6. AVISOS E GESTÃO ---
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

window.salvarGestao = function() {
    const tipo = document.getElementById('gestao-tipo').value;
    const nome = document.getElementById('gestao-nome').value;
    const info = document.getElementById('gestao-info').value;
    window.dbRefs.push(window.dbRefs.ref(window.db, 'gestao'), { tipo, nome, info });
    alert("Adicionado!");
};

// --- 7. ATUALIZADORES DE TELA ---
function atualizarQuadroAvisos() {
    const html = avisosGerais.map(a => `
        <div class="card aviso-item" style="margin-bottom:15px; padding:15px;">
            <p style="white-space: pre-wrap;">${a.texto}</p>
            ${a.midia ? `<img src="${a.midia}" style="max-width:100%; border-radius:10px; margin-top:10px;">` : ""}
            <small style="display:block; margin-top:10px; color:#666;">${a.data}</small>
        </div>`).join('');
    if(document.getElementById('quadro-avisos-membro')) document.getElementById('quadro-avisos-membro').innerHTML = html;
}

function atualizarAreaMembroGestao() {
    const dL = document.getElementById('lista-deptos-membro');
    const zL = document.getElementById('lista-zaps-membro');
    if(dL) dL.innerHTML = ""; if(zL) zL.innerHTML = "";
    itensGestao.forEach(i => {
        if (i.tipo === 'depto') {
            if(dL) dL.innerHTML += `<div class="card"><strong>${i.nome}</strong><p>${i.info}</p></div>`;
        } else {
            if(zL) zL.innerHTML += `<a href="${i.info}" target="_blank" class="btn btn-member" style="background:#25d366; text-decoration:none; display:block; text-align:center; margin-bottom:10px;">🟢 Grupo: ${i.nome}</a>`;
        }
    });
}

function atualizarListaPessoas() {
    const lista = document.getElementById('lista-pessoas-aprovadas');
    if (lista) {
        lista.innerHTML = membrosAprovados.map(m => `
            <li class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
                <span>${m.nome} (${m.cargo})</span>
                <div>
                    <button onclick="abrirModalEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button onclick="removerMembro('${m.id}')" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button>
                </div>
            </li>`).join('');
    }
}

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

// --- 8. FUNÇÃO PARA O PRÓPRIO MEMBRO EDITAR SEU PERFIL ---
window.salvarAlteracoesPerfil = function() {
    if (!usuarioLogado || !usuarioLogado.id) {
        alert("Erro: Usuário não identificado.");
        return;
    }

    const novoNome = document.getElementById('edit-nome').value.trim();
    const novoTel = document.getElementById('edit-tel').value.trim();
    
    // PEGA A FOTO DA PRÉ-VISUALIZAÇÃO
    let fotoPreview = document.getElementById('edit-avatar-preview').style.backgroundImage;
    // Limpa a string da URL para pegar apenas o Base64
    fotoPreview = fotoPreview.replace('url("', '').replace('")', '');

    if (novoNome === "") {
        alert("O nome não pode estar vazio.");
        return;
    }

    const { ref, set } = window.dbRefs;
    
    // Mostra um aviso de carregando (opcional)
    console.log("Salvando alterações...");

    // Atualiza Nome, Telefone e FOTO
    set(ref(window.db, `membros/${usuarioLogado.id}/nome`), novoNome)
        .then(() => {
            return set(ref(window.db, `membros/${usuarioLogado.id}/telefone`), novoTel);
        })
        .then(() => {
            // SALVA A FOTO NO BANCO
            if (fotoPreview.length > 10) {
                return set(ref(window.db, `membros/${usuarioLogado.id}/foto`), fotoPreview);
            }
        })
        .then(() => {
            alert("Perfil atualizado com sucesso!");
        })
        .catch((error) => {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar alterações.");
        });
};
// --- FUNÇÃO PARA LIMPAR O MURAL (ADICIONE NO FINAL DO ARQUIVO) ---
window.limparMural = function() {
    // Pergunta para evitar apagar sem querer
    if(confirm("Deseja realmente apagar TODOS os avisos do mural? Esta ação não pode ser desfeita.")) {
        const { ref, remove } = window.dbRefs;
        
        // Acessa o caminho 'avisos' no seu Firebase e deleta tudo o que estiver lá
        remove(ref(window.db, 'avisos'))
            .then(() => {
                alert("Mural limpo com sucesso!");
                // O quadro de avisos vai sumir automaticamente para os membros 
                // por causa do onValue que já está no seu código.
            })
            .catch((error) => {
                console.error("Erro ao limpar mural:", error);
                alert("Erro ao tentar limpar o mural.");
            });
    }
};

// --- 1. FUNÇÃO DE NAVEGAÇÃO DO PORTAL DO MEMBRO ---
window.navegarMembro = function(abaId) {
    // Esconde todos os conteúdos das abas do membro
    document.querySelectorAll('.tab-content-membro').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove o 'active' de todos os botões do membro
    document.querySelectorAll('.tabs-membro button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostra o selecionado
    const targetContent = document.getElementById('tab-m-' + abaId);
    const targetBtn = document.getElementById('btn-m-' + abaId);
    
    if (targetContent) targetContent.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('active');
};

// --- AJUSTE NA FUNÇÃO DE ATUALIZAR LISTA (Para preencher o portal do membro também) ---
function atualizarListaPessoas() {
    const listaAdm = document.getElementById('lista-pessoas-aprovadas');
    const listaPublica = document.getElementById('ul-membros-comunidade'); // Nova lista no portal
    
    const htmlMembros = membrosAprovados.map(m => `
        <li class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
            <span>${m.nome} (${m.cargo})</span>
            <div>
                <button onclick="abrirModalEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                <button onclick="removerMembro('${m.id}')" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button>
            </div>
        </li>`).join('');

    const htmlPublico = membrosAprovados.map(m => `
        <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
            <div style="width: 35px; height: 35px; border-radius: 50%; background-color: #ddd; background-image: url(${m.foto || ''}); background-size: cover;"></div>
            <div>
                <strong style="display: block; font-size: 0.9rem;">${m.nome} ${m.sobrenome}</strong>
                <small style="color: #666;">${m.cargo}</small>
            </div>
        </li>`).join('');

    if (listaAdm) listaAdm.innerHTML = htmlMembros;
    if (listaPublica) listaPublica.innerHTML = htmlPublico;
}

// [Mantenha todas as outras funções: loginMembro, checkAdmin, salvarAlteracoesPerfil, enviarAviso, etc., exatamente como estão no seu original]

// --- NOVA FUNÇÃO: Pré-visualização da foto na edição de perfil ---
window.previewEditPhoto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Atualiza a pré-visualização na área de edição
            const preview = document.getElementById('edit-avatar-preview');
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.innerHTML = ''; // Remove o conteúdo anterior
        };
        reader.readAsDataURL(input.files[0]);
    }
};
const checkDb = setInterval(() => { 
    if (window.db && window.dbRefs) { inicializarApp(); clearInterval(checkDb); } 
}, 500);
// --- SERVICE WORKER (PARA PWA/OFFLINE) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Erro SW:', err));
    });
}