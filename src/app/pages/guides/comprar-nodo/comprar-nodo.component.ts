import { Component } from '@angular/core';
import { ImgFallbackDirective } from '../../../directives/img-fallback.directive';

interface Product {
  name: string;
  description: string;
  image: string;
  links: { label: string; url: string }[];
}

/** Ilustraciones oficiales del flasher de Meshtastic: estables y con el mismo estilo. */
const FLASHER_IMG = 'https://flasher.meshtastic.org/img/devices';

@Component({
  selector: 'app-comprar-nodo',
  imports: [ImgFallbackDirective],
  templateUrl: './comprar-nodo.component.html',
})
export class ComprarNodoComponent {
  readonly boards: Product[] = [
    {
      name: 'Heltec v4',
      description: 'La placa más moderna para Meshtastic, versión mejorada del Heltec v3; el módulo con mayor potencia, de 28 dBm.',
      image: `${FLASHER_IMG}/heltec_v4.svg`,
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005010062440740.html' }],
    },
    {
      name: 'Heltec v3',
      description: 'Placa moderna, robusta y la más usada en la comunidad Meshtastic. Bajo consumo y excelente soporte.',
      image: `${FLASHER_IMG}/heltec-v3.svg`,
      links: [
        { label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005008451687223.html' },
        { label: 'Mercado Libre (Heltec v2)', url: 'https://www.mercadolibre.com.mx/sx1276-esp32-lora-915-mhz-oled-096/p/MLM36484548' },
      ],
    },
    {
      name: 'Heltec Wireless Paper',
      description: 'Placa con pantalla de tinta electrónica y batería. Perfecta para nodos portátiles y bajo consumo.',
      image: `${FLASHER_IMG}/heltec-wireless-paper.svg`,
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005007747207784.html' }],
    },
    {
      name: 'Heltec T114',
      description: 'Muy popular, ideal para proyectos DIY de bajo consumo y módulo GPS.',
      image: `${FLASHER_IMG}/heltec-mesh-node-t114.svg`,
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005009075123612.html' }],
    },
    {
      name: 'LILYGO TTGO LoRa32 V2.1',
      description: 'Módulo versátil, fácil de conseguir y con conector SMA para antena.',
      image: `${FLASHER_IMG}/tlora-v2-1-1_6.svg`,
      links: [
        { label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005007659670298.html' },
        { label: 'Mercado Libre', url: 'https://www.mercadolibre.com.mx/ttgo-lora32-v21915mhz/p/MLM47569417' },
      ],
    },
    {
      name: 'Kit Meshtastic RAK4631',
      description: 'Placa base RAK19007, ideal para comenzar con hardware RAK y Meshtastic.',
      image: `${FLASHER_IMG}/rak4631.svg`,
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005006901039995.html' }],
    },
  ];

  // Las antenas no tienen ilustración oficial: se usan las fotos de la tienda, con respaldo si fallan.
  readonly antennas: Product[] = [
    {
      name: 'Antena Gizont SMA 915MHz',
      description: 'Antena Gizont omnidireccional 10dBi de 17cm. Ideal para aumentar el alcance de comunicación hasta 2x.',
      image: 'https://ae-pic-a1.aliexpress-media.com/kf/S639fec4e080f44b39e9ed3986b8494d4E.jpg_960x960q75.jpg_.avif',
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005004607615001.html' }],
    },
    {
      name: 'Antena Heltec SMA 915MHz',
      description: 'Antena Heltec omnidireccional 10dBi de 17cm.',
      image: 'https://ae-pic-a1.aliexpress-media.com/kf/S7ae8f2525def49c9b8cc3d7e97c83c39u.png_960x960.png_.avif',
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005008568234012.html' }],
    },
    {
      name: 'Antena SMA 915MHz',
      description: 'Antena genérica omnidireccional 5dBi de 19.5cm. Incluye adaptador IPEX a SMA.',
      image: 'https://ae-pic-a1.aliexpress-media.com/kf/S4c460658d2a345f78eea5ea3da4641a0k.jpg_960x960q75.jpg_.avif',
      links: [{ label: 'AliExpress', url: 'https://es.aliexpress.com/item/1005008297942095.html' }],
    },
  ];
}
