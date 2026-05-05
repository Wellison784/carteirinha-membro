let membrosAprovados = [];
let avisosGerais = [];
let itensGestao = [];
let usuarioLogado = null;

function inicializarApp() {
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
                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
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

setTimeout(() => { if (window.db) inicializarApp(); }, 1000);

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-tab-' + tab).classList.add('active');
}

// LOGIN DO MEMBRO CORRIGIDO E SINCRONIZADO
window.loginMembro = function() {
    const e = document.getElementById('member-email').value;
    const p = document.getElementById('member-pass').value;
    const m = membrosAprovados.find(u => u.email === e && u.senha === p);
    
    if (m) {
        usuarioLogado = m;
        
        // 1. Preenche Nome e Cargo na carteirinha
        document.getElementById('card-nome').innerText = `${m.nome} ${m.sobrenome}`;
        const cargoEl = document.getElementById('card-cargo-display') || document.getElementById('card-cargo');
        if (cargoEl) cargoEl.innerText = m.cargo;

        // 2. Carrega a Foto de Perfil imediatamente
        const pic = document.getElementById('card-foto-display');
        if (m.foto && pic) {
            pic.style.backgroundImage = `url(${m.foto})`;
            pic.style.backgroundSize = 'cover';
            pic.style.backgroundPosition = 'center';
        } else if (pic) {
            pic.style.backgroundImage = 'none';
            pic.style.backgroundColor = '#ccc';
        }

        // 3. Força a atualização visual dos Departamentos e Avisos
        atualizarAreaMembroGestao();
        atualizarQuadroAvisos();
        
        // 4. Abre a tela do perfil
        showScreen('member-profile');
    } else {
        alert('Usuário não encontrado ou aguardando aprovação.');
    }
}

window.alterarFotoPerfil = function(input) {
    if (input.files && input.files[0] && usuarioLogado) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result;
            window.dbRefs.set(window.dbRefs.ref(window.db, `membros/${usuarioLogado.id}/foto`), b64)
                .then(() => {
                    const pic = document.getElementById('card-foto-display');
                    if(pic) pic.style.backgroundImage = `url(${b64})`;
                    usuarioLogado.foto = b64;
                    alert("Foto atualizada!");
                });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

document.getElementById('registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    let fotoPreview = document.getElementById('reg-avatar-preview').style.backgroundImage;
    fotoPreview = fotoPreview.replace('url("', '').replace('")', '');

    const dados = {
        nome: document.getElementById('reg-nome').value,
        sobrenome: document.getElementById('reg-sobrenome').value,
        email: document.getElementById('reg-email').value,
        senha: document.getElementById('reg-pass').value,
        cargo: document.getElementById('reg-cargo').value,
        nascimento: document.getElementById('reg-nascimento').value,
        batizado: document.getElementById('reg-batizado')?.value || "Não informado",
        dataBatismo: document.getElementById('reg-data-batismo').value,
        telefone: document.getElementById('reg-tel').value,
        foto: fotoPreview || "",
        status: "Ativo"
    };
    
    window.dbRefs.push(window.dbRefs.ref(window.db, 'pendentes'), dados);
    alert('Cadastro enviado ao Pastor!');
    showScreen('home-screen');
});

window.salvarGestao = function() {
    const tipo = document.getElementById('gestao-tipo').value;
    const nome = document.getElementById('gestao-nome').value;
    const info = document.getElementById('gestao-info').value;
    window.dbRefs.push(window.dbRefs.ref(window.db, 'gestao'), { tipo, nome, info });
    alert("Adicionado!");
    document.getElementById('gestao-nome').value = "";
    document.getElementById('gestao-info').value = "";
}

function atualizarAreaMembroGestao() {
    const dL = document.getElementById('lista-deptos-membro');
    const zL = document.getElementById('lista-zaps-membro');
    const aL = document.getElementById('admin-gestao-list');
    if(dL) dL.innerHTML = ""; if(zL) zL.innerHTML = ""; if(aL) aL.innerHTML = "";

    itensGestao.forEach(i => {
        if (i.tipo === 'depto') {
            if(dL) dL.innerHTML += `<div class="card"><strong>${i.nome}</strong><p>${i.info}</p></div>`;
        } else {
            if(zL) zL.innerHTML += `
                <a href="${i.info}" target="_blank" class="btn btn-member" style="background:#25d366; color:white; text-decoration:none; display:block; text-align:center; padding:12px; border-radius:8px; margin-bottom:10px; font-weight:bold;">
                    🟢 ACESSAR GRUPO: ${i.nome}
                </a>`;
        }
        if(aL) aL.innerHTML += `<div class="card" style="display:flex; justify-content:space-between"><span>${i.nome}</span><button onclick="removerGestao('${i.id}')" style="color:red; border:none; cursor:pointer;">🗑️</button></div>`;
    });
}

function removerGestao(id) { 
    if(confirm("Excluir item?")) window.dbRefs.remove(window.dbRefs.ref(window.db, `gestao/${id}`)); 
}

function atualizarListaPessoas() {
    const lista = document.getElementById('lista-pessoas-aprovadas');
    if (lista) {
        lista.innerHTML = membrosAprovados.map(m => `
            <li class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span>${m.nome} (${m.cargo})</span>
                <button onclick="removerMembro('${m.id}')" style="color:red; background:none; border:none;">🗑️</button>
            </li>`).join('');
    }
}

function removerMembro(id) { 
    if(confirm("Excluir membro?")) window.dbRefs.remove(window.dbRefs.ref(window.db, `membros/${id}`)); 
}

function aprovarMembroFirebase(id) {
    const { ref, set, remove, onValue } = window.dbRefs;
    onValue(ref(window.db, `pendentes/${id}`), (snap) => {
        const d = snap.val();
        if (d) { 
            set(ref(window.db, `membros/${id}`), d); 
            remove(ref(window.db, `pendentes/${id}`)); 
        }
    }, { onlyOnce: true });
}

window.enviarAviso = function() {
    const texto = document.getElementById('texto-aviso').value;
    const midia = document.getElementById('upload-midia').files[0];
    if (midia) {
        const reader = new FileReader();
        reader.onload = (e) => salvarAviso(texto, e.target.result);
        reader.readAsDataURL(midia);
    } else { salvarAviso(texto, ""); }
}

function salvarAviso(texto, midia) {
    window.dbRefs.push(window.dbRefs.ref(window.db, 'avisos'), { 
        texto, 
        midia, 
        data: new Date().toLocaleDateString('pt-BR') 
    });
    alert("Postado!");
    document.getElementById('texto-aviso').value = "";
}

function atualizarQuadroAvisos() {
    const html = avisosGerais.map(a => `
        <div class="card" style="position:relative; margin-bottom:15px;">
            <button onclick="removerAviso('${a.id}')" style="position:absolute; top:5px; right:5px; color:red; border:none; background:none;">🗑️</button>
            <small>${a.data}</small><p style="margin-top:10px">${a.texto}</p>
            ${a.midia ? `<img src="${a.midia}" style="width:100%; border-radius:8px; margin-top:10px">` : ""}
        </div>`).join('');
    if(document.getElementById('quadro-avisos-membro')) document.getElementById('quadro-avisos-membro').innerHTML = html;
    if(document.getElementById('lista-avisos-adm')) document.getElementById('lista-avisos-adm').innerHTML = html;
}

function removerAviso(id) { 
    if(confirm("Remover aviso?")) window.dbRefs.remove(window.dbRefs.ref(window.db, `avisos/${id}`)); 
}

window.checkAdmin = function() {
    const e = document.getElementById('admin-email').value;
    const p = document.getElementById('admin-pass').value;
    if (e === "wellison20111@gmail.com" && p === "291220") showScreen('admin-dashboard');
    else alert('Erro!');
}

window.previewImage = function(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { 
            const el = document.getElementById(id);
            el.style.backgroundImage = `url(${e.target.result})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Erro SW:', err));
    });
}