
class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
  }

  connectedCallback() {
    if (this.button) {
      this.button.addEventListener('click', this.calculate.bind(this));
    }
    
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.calculate();
        }
      });

      this.input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
          value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        e.target.value = value;
      });
    }
  }

  async calculate() {
    const cep = this.input.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    this.button.disabled = true;
    const originalText = this.button.innerText;
    this.button.innerText = 'Calculando...';
    this.results.style.display = 'none';

    try {
      // Usamos apenas o ViaCEP que é ultra-rápido e não tem erro de CORS
      const geoResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const geoData = await geoResponse.json();
      
      if (geoData.erro) {
        alert('CEP não encontrado. Verifique os números.');
        return;
      }

      this.displayRegionalRates(geoData);

    } catch (e) {
      console.error('Erro no cálculo:', e);
      alert('Houve um erro técnico ao consultar o CEP. Tente novamente.');
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRegionalRates(location) {
    this.results.style.display = 'block';
    const uf = location.uf;
    let rates = [];

    // Tabela de Fretes Dinâmica por Região (Baseada no CEP de SP)
    if (uf === 'SP') {
      rates = [
        { name: 'Correios SEDEX', price: 19.90, time: '1 a 3' },
        { name: 'Correios PAC', price: 14.90, time: '4 a 6' }
      ];
    } else if (['RJ', 'MG', 'ES', 'PR', 'SC', 'RS'].includes(uf)) {
      rates = [
        { name: 'Correios SEDEX', price: 34.90, time: '3 a 5' },
        { name: 'Correios PAC', price: 24.90, time: '6 a 10' }
      ];
    } else if (['DF', 'GO', 'MS', 'MT'].includes(uf)) {
      rates = [
        { name: 'Correios SEDEX', price: 45.90, time: '4 a 6' },
        { name: 'Correios PAC', price: 32.90, time: '8 a 12' }
      ];
    } else if (['BA', 'PE', 'CE', 'AL', 'SE', 'PB', 'RN', 'MA', 'PI'].includes(uf)) {
      rates = [
        { name: 'Correios SEDEX', price: 69.90, time: '5 a 8' },
        { name: 'Correios PAC', price: 39.90, time: '12 a 18' }
      ];
    } else {
      // Norte e demais
      rates = [
        { name: 'Correios SEDEX', price: 89.90, time: '6 a 10' },
        { name: 'Correios PAC', price: 49.90, time: '15 a 25' }
      ];
    }

    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;

    rates.forEach(rate => {
      const priceFormatted = rate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.name}</span>
            <small style="color: #666;">Entrega em ${rate.time} dias úteis</small>
          </div>
          <strong style="color: #000;">${priceFormatted}</strong>
        </div>
      `;
    });

    html += `
      <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.02); border: 1px dashed #ccc; border-radius: 6px; font-size: 0.8rem; color: #777; line-height: 1.4;">
        <strong>Nota:</strong> Estes valores são estimativas baseadas na sua região. O valor exato será confirmado no checkout.
      </div>
      <div style="margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem; color: #777; line-height: 1.4;">
        * Lembre-se: O prazo acima é o tempo de entrega da transportadora e deve ser somado aos <strong>05 a 30 dias úteis</strong> de produção das peças.
      </div>
    `;

    this.results.innerHTML = html;
  }
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
