
class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
    
    this.productPrice = parseFloat(this.getAttribute('data-product-price')) || 0;
    this.productWeight = parseFloat(this.getAttribute('data-product-weight')) || 0.5;
    
    this.frenetToken = 'D2DDEDB9R5FF9R4891RAACBRF6A45B4521B3';
    this.sellerCEP = '08473470'; 

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

    try {
      const geoResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const geoData = await geoResponse.json();
      
      if (geoData.erro) {
        alert('CEP não encontrado. Verifique os números e tente novamente.');
        this.results.style.display = 'none';
        return;
      }

      // Tentativa de consulta real na Frenet
      try {
        const frenetBody = {
          "SellerCEP": this.sellerCEP,
          "RecipientCEP": cep,
          "ShipmentItemValue": this.productPrice,
          "ShippingItemArray": [
            {
              "Weight": this.productWeight,
              "Length": 16,
              "Height": 11,
              "Width": 11,
              "Quantity": 1
            }
          ]
        };

        const response = await fetch('https://corsproxy.io/?https://api.frenet.com.br/shipping/quote', {
          method: 'POST',
          headers: {
            'token': this.frenetToken
          },
          body: JSON.stringify(frenetBody)
        });

        if (!response.ok) throw new Error('Proxy error');

        const data = await response.json();

        if (data.ShippingSevicesArray && data.ShippingSevicesArray.length > 0) {
          this.displayRates(data.ShippingSevicesArray, geoData);
        } else {
          this.displayFallbackRates(geoData);
        }
      } catch (frenetError) {
        console.warn('Erro na API Frenet, usando estimativa regional:', frenetError);
        this.displayFallbackRates(geoData);
      }

    } catch (e) {
      console.error('Erro geral no cálculo:', e);
      alert('Houve um erro ao tentar calcular o frete. Tente novamente mais tarde.');
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRates(rates, location) {
    this.results.style.display = 'block';
    
    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;
    
    const validRates = rates.filter(r => !r.Error);

    if (validRates.length === 0) {
      this.displayFallbackRates(location);
      return;
    }

    validRates.forEach(rate => {
      const price = parseFloat(rate.ShippingPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.ServiceDescription}</span>
            <small style="color: #666;">Entrega em até ${rate.DeliveryTime} dias úteis</small>
          </div>
          <strong style="color: #000;">${price}</strong>
        </div>
      `;
    });

    html += this.getNoticeHTML();
    this.results.innerHTML = html;
  }

  displayFallbackRates(location) {
    this.results.style.display = 'block';
    
    // Tabela de estimativa regional baseada no Estado (UF)
    const uf = location.uf;
    let rates = [];

    if (uf === 'SP') {
      rates = [
        { name: 'Correios SEDEX', price: 18.90, time: '2 a 4' },
        { name: 'Correios PAC', price: 14.50, time: '5 a 8' }
      ];
    } else if (['RJ', 'MG', 'PR', 'SC', 'RS', 'ES'].includes(uf)) {
      rates = [
        { name: 'Correios SEDEX', price: 34.90, time: '3 a 6' },
        { name: 'Correios PAC', price: 26.50, time: '8 a 12' }
      ];
    } else if (['DF', 'GO', 'MS', 'MT'].includes(uf)) {
      rates = [
        { name: 'Correios SEDEX', price: 42.00, time: '4 a 7' },
        { name: 'Correios PAC', price: 32.00, time: '10 a 15' }
      ];
    } else {
      rates = [
        { name: 'Correios SEDEX', price: 68.00, time: '5 a 9' },
        { name: 'Correios PAC', price: 48.00, time: '12 a 20' }
      ];
    }

    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong> (Estimativa)
      </p>
    `;

    rates.forEach(rate => {
      const price = rate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.name}</span>
            <small style="color: #666;">Entrega em ${rate.time} dias úteis</small>
          </div>
          <strong style="color: #000;">${price}</strong>
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
