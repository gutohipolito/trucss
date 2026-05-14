class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
    
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

      // Mask for CEP
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

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        alert('CEP não encontrado. Verifique os números e tente novamente.');
        this.results.style.display = 'none';
      } else {
        this.displayRates(data);
      }
    } catch (e) {
      console.error('Erro ao calcular frete:', e);
      alert('Houve um erro ao tentar calcular o frete. Tente novamente mais tarde.');
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRates(location) {
    this.results.style.display = 'block';
    
    // Simulação de fretes (Em um cenário real, isso viria de uma API de frete)
    const rates = [
      { name: 'Correios PAC', price: 'R$ 18,90', time: '6 a 10 dias úteis' },
      { name: 'Correios SEDEX', price: 'R$ 32,50', time: '2 a 4 dias úteis' },
      { name: 'Jadlog Premium', price: 'R$ 28,90', time: '3 a 5 dias úteis' }
    ];

    let html = `
      <div class="shipping-calculator__production-notice" style="margin-bottom: 20px; font-size: 0.85rem; color: #c3002f; line-height: 1.4; display: flex; gap: 8px; align-items: flex-start; background: rgba(195, 0, 47, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(195, 0, 47, 0.1);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span><strong>Importante:</strong> Nossas peças são artesanais. O prazo total é o tempo de trânsito + <strong>05 a 30 dias úteis</strong> de produção.</span>
      </div>
      <p style="margin-bottom: 10px; font-size: 0.9rem; color: #666;">Entrega para: ${location.logradouro ? location.logradouro + ', ' : ''}${location.bairro}, ${location.localidade} - ${location.uf}</p>
    `;
    
    rates.forEach(rate => {
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.name}</span>
            <small style="color: #666;">Entrega em ${rate.time}</small>
          </div>
          <strong style="color: #000;">${rate.price}</strong>
        </div>
      `;
    });

    html += `
      <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem; color: #777;">
        * Lembre-se: O prazo acima é o tempo de entrega da transportadora e deve ser somado aos <strong>05 a 30 dias úteis</strong> de produção das peças.
      </div>
    `;

    this.results.innerHTML = html;
  }
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
