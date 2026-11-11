import { STATUS_ATESTADO, TIPOS_ATESTADO } from '@/services/atestadosService';

const NAVY = [0, 53, 128];
const CINZA = [107, 114, 128];
export const AVISO_LGPD = 'Dados de saúde são dados pessoais sensíveis (Lei 13.709/2018, LGPD). Acesso restrito ao RH responsável, para cumprimento de obrigação legal. Não compartilhar.';
const AVISO = 'Documento confidencial, sem identificação das pessoas. Dados de saúde são sensíveis (Lei 13.709/2018, LGPD). Uso restrito ao RH.';

const apelidos = (resumo) => new Map(resumo.ranking.map((p, i) => [p.id, `Pessoa ${i + 1}`]));

const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const hojeBR = () => new Date().toLocaleDateString('pt-BR');
const nomeArquivo = (empresa, ext) => `atestados-${(empresa || 'empresa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${ext}`;

const carregarLogo = async () => {
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = '/logo.png';
    });
    const largura = 480;
    const altura = Math.round((img.naturalHeight / img.naturalWidth) * largura);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(img, 0, 0, largura, altura);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), proporcao: altura / largura };
  } catch {
    return null;
  }
};

export const exportarResumoPDF = async ({ empresa, seguradora, resumo, rankings, descricaoCid }) => {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 14;

  const apelido = apelidos(resumo);
  const logo = await carregarLogo();
  if (logo) doc.addImage(logo.dataUrl, 'JPEG', margem, 12, 42, 42 * logo.proporcao);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('Resumo de atestados', largura - margem, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text(`${empresa || ''}${seguradora ? ` · ${seguradora}` : ''}`, largura - margem, 24, { align: 'right' });
  doc.text(`Últimos 12 meses · gerado em ${hojeBR()}`, largura - margem, 29, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.line(margem, 34, largura - margem, 34);

  const pessoasComAtestado = resumo.ranking.length;
  const diasTotais = resumo.ranking.reduce((t, p) => t + p.dias, 0);
  const caixas = [
    ['Atestados', String(resumo.totalAtestados)],
    ['Pessoas', String(pessoasComAtestado)],
    ['Dias de afastamento', String(diasTotais)],
    ['Custo estimado', formatBRL(resumo.custoTotal)],
  ];
  const larguraCaixa = (largura - margem * 2 - 9) / 4;
  caixas.forEach(([rotulo, valor], i) => {
    const x = margem + i * (larguraCaixa + 3);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, 39, larguraCaixa, 18, 2, 2);
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(rotulo, x + 3, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(valor, x + 3, 52);
    doc.setFont('helvetica', 'normal');
  });

  let y = 64;
  const titulo = (texto) => {
    if (y > altura - 50) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(texto, margem, y);
    y += 3;
  };
  const tabela = (head, body, colunas = {}) => {
    doc.autoTable({
      startY: y,
      head: [head],
      body: body.length ? body : [head.map(() => '—')],
      margin: { left: margem, right: margem, bottom: 18 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: { bottom: 0.1 } },
      headStyles: { fontStyle: 'bold', textColor: CINZA, fontSize: 7.5 },
      columnStyles: colunas,
      didParseCell: (dados) => {
        if (dados.section === 'head' && colunas[dados.column.index]?.halign) dados.cell.styles.halign = colunas[dados.column.index].halign;
      },
    });
    y = doc.lastAutoTable.finalY + 9;
  };
  const direita = { halign: 'right' };

  rankings.forEach((r) => {
    titulo(r.chave === 'dias' ? 'As 10 pessoas com mais dias de afastamento' : 'As 10 pessoas com mais atestados');
    tabela(
      ['#', 'Pessoa', 'Atestados', 'Dias', 'Custo estimado'],
      r.lista.map((p, i) => [i + 1, apelido.get(p.id), p.qtd, p.dias, formatBRL(p.custo)]),
      { 0: { cellWidth: 8 }, 2: direita, 3: direita, 4: direita },
    );
  });

  titulo('CIDs que mais afastaram (soma da empresa, sem identificar pessoas)');
  tabela(
    ['CID', 'Descrição', 'Dias'],
    resumo.porCid.map((c) => [c.cid, descricaoCid(c.cid) || '—', c.dias]),
    { 0: { cellWidth: 18 }, 2: direita },
  );

  titulo('Mês a mês');
  tabela(
    ['Mês', 'Atestados', 'Dias', 'Custo estimado'],
    resumo.porMes.map((m, i) => [m.mes, m.atestados, m.dias, formatBRL(resumo.totalMes[resumo.meses[i].chave] || 0)]),
    { 1: direita, 2: direita, 3: direita },
  );

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(doc.splitTextToSize(AVISO, largura - margem * 2 - 40), margem, altura - 12);
    doc.text(`Ágil Seguros · ${i} de ${paginas}`, largura - margem, altura - 12, { align: 'right' });
  }

  doc.save(nomeArquivo(empresa, 'pdf'));
};

export const exportarExcel = async ({ empresa, resumo, descricaoCid }) => {
  const XLSX = await import('xlsx');
  const livro = XLSX.utils.book_new();
  const apelido = apelidos(resumo);

  const atestados = resumo.linhas.map(({ atestado: a, ordem, dias, custo }) => ({
    Pessoa: apelido.get(a.beneficiario_id) || 'Pessoa',
    'Atestado nº': ordem,
    Tipo: TIPOS_ATESTADO.find((t) => t.value === a.tipo)?.label || a.tipo,
    'Início': formatData(a.data_inicio),
    'Término': formatData(a.data_fim),
    Dias: dias,
    CID: a.cid || '',
    'Descrição do CID': descricaoCid(a.cid) || '',
    'Situação': STATUS_ATESTADO[a.status || 'PENDENTE']?.label || a.status,
    'Custo estimado (R$)': Number(custo.toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(atestados), 'Atestados');

  const ranking = resumo.ranking.map((p, i) => ({
    'Posição': i + 1,
    Pessoa: apelido.get(p.id),
    Atestados: p.qtd,
    'Dias totais': p.dias,
    'Custo total (R$)': Number(p.custo.toFixed(2)),
    CIDs: p.cids.map((c) => c.cid).join(', '),
  }));
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(ranking), 'Ranking');

  const porCusto = [...resumo.ranking].sort((x, y) => y.custo - x.custo);
  const custo = porCusto.map((p) => {
    const linha = { Pessoa: apelido.get(p.id) };
    resumo.meses.forEach((m) => { linha[m.rotulo] = Number((p.custoMes[m.chave] || 0).toFixed(2)); });
    linha.Total = Number(p.custo.toFixed(2));
    return linha;
  });
  const total = { Pessoa: 'Total do mês' };
  resumo.meses.forEach((m) => { total[m.rotulo] = Number((resumo.totalMes[m.chave] || 0).toFixed(2)); });
  total.Total = Number(resumo.custoTotal.toFixed(2));
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([...custo, total]), 'Custo por mês');

  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([[AVISO], [`Gerado em ${hojeBR()}`]]), 'Aviso');

  XLSX.writeFile(livro, nomeArquivo(empresa, 'xlsx'));
};

