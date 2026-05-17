import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
// ── CSV ──────────────────────────────────────────────────────────────
export async function exportarCSV(transacciones, cuentas, mes) {
  const nombreMes = mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const nombreCuenta = (cuentaId) =>
    cuentas.find(c => c.id === cuentaId)?.nombre || 'Sin cuenta';

  const formatearFecha = (fecha) => {
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-ES');
  };

  // Encabezados
  let csv = 'Fecha,Tipo,Categoría,Cuenta,Monto,Descripción\n';

  // Filas
  transacciones.forEach(t => {
    const fila = [
      formatearFecha(t.fecha),
      t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      t.categoria || '',
      nombreCuenta(t.cuentaId),
      t.monto.toFixed(2),
      t.descripcion || ''
    ].map(v => `"${v}"`).join(',');
    csv += fila + '\n';
  });

  // Totales al final
  const totalIngresos = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((s, t) => s + t.monto, 0);
  const totalGastos = transacciones
    .filter(t => t.tipo === 'gasto')
    .reduce((s, t) => s + t.monto, 0);

  csv += `\n"","","","Total ingresos","${totalIngresos.toFixed(2)}",""\n`;
  csv += `"","","","Total gastos","${totalGastos.toFixed(2)}",""\n`;
  csv += `"","","","Saldo neto","${(totalIngresos - totalGastos).toFixed(2)}",""\n`;

  // Guardar y compartir
  const ruta = FileSystem.documentDirectory + `reporte_${nombreMes}.csv`;
  await FileSystem.writeAsStringAsync(ruta, csv, {
    encoding: FileSystem.EncodingType.UTF8
  });

  await Sharing.shareAsync(ruta, {
    mimeType: 'text/csv',
    dialogTitle: `Reporte ${nombreMes}`,
    UTI: 'public.comma-separated-values-text'
  });
}

// ── PDF ──────────────────────────────────────────────────────────────
export async function exportarPDF(transacciones, cuentas, mes) {
  const nombreMes = mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const nombreCuenta = (cuentaId) =>
    cuentas.find(c => c.id === cuentaId)?.nombre || 'Sin cuenta';

  const formatearFecha = (fecha) => {
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-ES');
  };

  const totalIngresos = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((s, t) => s + t.monto, 0);
  const totalGastos = transacciones
    .filter(t => t.tipo === 'gasto')
    .reduce((s, t) => s + t.monto, 0);
  const saldoNeto = totalIngresos - totalGastos;

  // Gastos por categoría
  const porCategoria = {};
  transacciones
    .filter(t => t.tipo === 'gasto')
    .forEach(t => {
      porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.monto;
    });

  const filasCategoria = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, monto]) => `
      <tr>
        <td>${cat}</td>
        <td style="text-align:right; color:#dc2626;">$${monto.toFixed(2)}</td>
        <td style="text-align:right; color:#888;">
          ${totalGastos > 0 ? ((monto / totalGastos) * 100).toFixed(1) : 0}%
        </td>
      </tr>
    `).join('');

  // Filas de transacciones
  const filasTransacciones = transacciones.map(t => `
    <tr>
      <td>${formatearFecha(t.fecha)}</td>
      <td style="color:${t.tipo === 'ingreso' ? '#16a34a' : '#dc2626'}">
        ${t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
      </td>
      <td>${t.categoria || ''}</td>
      <td>${nombreCuenta(t.cuentaId)}</td>
      <td style="text-align:right; font-weight:bold; color:${t.tipo === 'ingreso' ? '#16a34a' : '#dc2626'}">
        ${t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toFixed(2)}
      </td>
      <td>${t.descripcion || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 30px; }

        .encabezado {
          background: #4f46e5;
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .encabezado h1 { font-size: 24px; margin-bottom: 4px; }
        .encabezado p { font-size: 13px; opacity: 0.8; }

        .resumen {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .tarjeta {
          flex: 1;
          padding: 16px;
          border-radius: 10px;
          text-align: center;
        }
        .tarjeta .label { font-size: 12px; color: #888; margin-bottom: 6px; }
        .tarjeta .monto { font-size: 20px; font-weight: bold; }

        h2 {
          font-size: 16px;
          color: #4f46e5;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #e0e7ff;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
          font-size: 13px;
        }
        th {
          background: #f0f4f8;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          color: #555;
        }
        td { padding: 9px 8px; border-bottom: 1px solid #f0f4f8; }
        tr:last-child td { border-bottom: none; }

        .pie {
          text-align: center;
          font-size: 11px;
          color: #aaa;
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>

      <div class="encabezado">
        <h1>💰 Reporte Financiero</h1>
        <p>${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}</p>
      </div>

      <div class="resumen">
        <div class="tarjeta" style="background:#dcfce7">
          <div class="label">Total Ingresos</div>
          <div class="monto" style="color:#16a34a">$${totalIngresos.toFixed(2)}</div>
        </div>
        <div class="tarjeta" style="background:#fee2e2">
          <div class="label">Total Gastos</div>
          <div class="monto" style="color:#dc2626">$${totalGastos.toFixed(2)}</div>
        </div>
        <div class="tarjeta" style="background:#e0e7ff">
          <div class="label">Saldo Neto</div>
          <div class="monto" style="color:#4f46e5">$${saldoNeto.toFixed(2)}</div>
        </div>
      </div>

      ${filasCategoria ? `
        <h2>Gastos por Categoría</h2>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th style="text-align:right">Monto</th>
              <th style="text-align:right">% del total</th>
            </tr>
          </thead>
          <tbody>${filasCategoria}</tbody>
        </table>
      ` : ''}

      <h2>Detalle de Transacciones</h2>
      ${transacciones.length === 0
        ? '<p style="color:#aaa; text-align:center; padding:20px">Sin transacciones este mes</p>'
        : `
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th style="text-align:right">Monto</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>${filasTransacciones}</tbody>
          </table>
        `
      }

      <div class="pie">
        Generado por Finanzas App • ${new Date().toLocaleDateString('es-ES')}
      </div>

    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const destino = FileSystem.documentDirectory + `reporte_${nombreMes}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: destino });

  await Sharing.shareAsync(destino, {
    mimeType: 'application/pdf',
    dialogTitle: `Reporte ${nombreMes}`,
    UTI: 'com.adobe.pdf'
  });
}