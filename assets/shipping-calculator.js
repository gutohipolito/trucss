
class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
    
    this.variantId = this.getAttribute('data-variant-id');
    this.productPrice = parseFloat(this.getAttribute('data-product-price')) || 0;
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
      // 1. Pegar localização via ViaCEP para UX
      const geoResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const geoData = await geoResponse.json();
      
      if (geoData.erro) {
        alert('CEP não encontrado.');
        return;
      }

      // 2. Fluxo AJAX Shopify (Cálculo Real)
      // Adicionamos o item temporariamente ao carrinho para o Shopify calcular
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: this.variantId, quantity: 1 }],
          sections: [] // Evita renderizar seções desnecessárias
        })
      });

      // Consultar as taxas reais do Shopify (que incluem a Frenet)
      const ratesResponse = await fetch(`/cart/shipping_rates.json?shipping_address[zip]=${cep}&shipping_address[country]=Brazil`);
      const ratesData = await ratesResponse.json();

      // Remover o item temporário do carrinho
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { [this.variantId]: 0 }
        })
      });

      if (ratesData.shipping_rates && ratesData.shipping_rates.length > 0) {
        this.displayRealRates(ratesData.shipping_rates, geoData);
      } else {
        this.displayFallbackRates(geoData);
      }

    } catch (e) {
      console.error('Erro no cálculo real, usando fallback:', e);
      this.displayFallbackRates({ localidade: 'Sua região', uf: '' });
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRealRates(rates, location) {
    this.results.style.display = 'block';
    
    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;

    rates.forEach(rate => {
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.name}</span>
            <small style="color: #666;">Entrega estimada</small>
          </div>
          <strong style="color: #000;">R$ ${rate.price}</strong>
        </div>
      `;
    });

    html += this.getNoticeHTML();
    this.results.innerHTML = html;
  }

  displayFallbackRates(location) {
    this.results.style.display = 'block';
    const uf = location.uf || 'SP';
    let rates = [];

    if (uf === 'SP') {
      rates = [{ name: 'PAC / SEDEX', price: 'Sob consulta', time: '2 a 8' }];
    } else {
      rates = [{ name: 'PAC / SEDEX', price: 'Sob consulta', time: '5 a 15' }];
    }

    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;

    rates.forEach(rate => {
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.name}</span>
            <small style="color: #666;">Prazo estimado: ${rate.time} dias úteis</small>
          </div>
          <strong style="color: #000;">${rate.price}</strong>
        </div>
      `;
    });

    html += this.getNoticeHTML();
    this.results.innerHTML = html;
  }

  getNoticeHTML() {
    return `
      <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem; color: #777; line-height: 1.4;">
        * Lembre-se: O prazo acima é o tempo de entrega da transportadora e deve ser somado aos <strong>05 a 30 dias úteis</strong> de produção das peças.
      </div>
    `;
  }
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
