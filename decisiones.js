document.addEventListener('DOMContentLoaded', () => {
    const selectorVehiculo = document.getElementById('selector-vehiculo');
    const controlsDiv = document.getElementById('controls-div');
    const cuerpoTabla = document.getElementById('cuerpo-tabla');

    // Cargar datos del sessionStorage
    const storedData = sessionStorage.getItem('logsDecisiones');
    if (!storedData) {
        return; // Muestra el mensaje por defecto "No hay datos"
    }

    let data = null;
    try {
        data = JSON.parse(storedData);
    } catch (e) {
        console.error("Error parseando logs:", e);
        return;
    }

    const vehiculos = data.vehiculos || [];
    
    if (vehiculos.length === 0) {
        return;
    }

    // Si hay más de un vehículo (modo comparativo), mostrar selector
    if (vehiculos.length > 1) {
        controlsDiv.style.display = 'flex';
        vehiculos.forEach((vehiculo, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = vehiculo.nombre;
            selectorVehiculo.appendChild(option);
        });

        selectorVehiculo.addEventListener('change', (e) => {
            const idx = parseInt(e.target.value);
            renderTable(vehiculos[idx].logs);
        });
    }

    // Renderizar tabla inicial con el primer vehículo
    renderTable(vehiculos[0].logs);
});

function renderTable(logs) {
    const cuerpoTabla = document.getElementById('cuerpo-tabla');
    cuerpoTabla.innerHTML = '';

    if (!logs || logs.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="4" class="no-data">No hay decisiones importantes registradas. (Ruta libre)</td></tr>`;
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        
        let decisionClass = '';
        if (log.decision.includes('Evitar')) decisionClass = 'evitar';
        else if (log.decision.includes('Avanzar')) decisionClass = 'avanzar';
        else if (log.decision.includes('Evaluar')) decisionClass = 'evaluar';

        tr.innerHTML = `
            <td>(${log.f}, ${log.c})</td>
            <td class="condicion">${log.condicion}</td>
            <td class="decision ${decisionClass}">${log.decision}</td>
            <td>${log.razon}</td>
        `;
        
        cuerpoTabla.appendChild(tr);
    });
}
