export class MagneticSensor {
  part_number: string = 'AS5X4X'
  bit_resolution: number = 14;
  protocol: string = 'SPI';
  spi_mode: string = 'SPI_MODE1';
  angle_register: string = '03xFFF';
  data_start_bit: number = null;
  command_rw_bit: number = null;
  command_parity_bit: number = null;
  clock_speed = 1000000;
  direction = true; //CW: 1, CCW: 0
}

export class Encoder {
  encA: number = null;
  encB: number = null;
  PPR: number = null;
  index_pin: number = null;
  quadrature = true;
  pullup: string = 'USE_EXTERN';
}


