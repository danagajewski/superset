/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { SyntheticEvent } from 'react';
import domToPdf from 'dom-to-pdf';
import { kebabCase } from 'lodash';
import { t } from '@apache-superset/core/translation';
import { logging } from '@apache-superset/core/utils';
import { addWarningToast } from 'src/components/MessageToasts/actions';
import getBootstrapData from 'src/utils/getBootstrapData';

const pdfCompressionLevel = getBootstrapData().common.pdf_compression_level;

/**
 * generate a consistent file stem from a description and date
 *
 * @param description title or description of content of file
 * @param date date when file was generated
 */
const generateFileStem = (description: string, date = new Date()) =>
  `${kebabCase(description)}-${date.toISOString().replace(/[: ]/g, '-')}`;

type SavedStyle = {
  el: HTMLElement;
  height: string;
  maxHeight: string;
  overflow: string;
  overflowY: string;
};

/**
 * Temporarily expand an element and its scrollable ancestors so that
 * all content is visible for capture. Returns a cleanup function that
 * restores the original inline styles.
 */
function expandElementForCapture(element: HTMLElement): () => void {
  const saved: SavedStyle[] = [];

  const expand = (el: HTMLElement) => {
    saved.push({
      el,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
      overflow: el.style.overflow,
      overflowY: el.style.overflowY,
    });
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
    el.style.overflowY = 'visible';
  };

  expand(element);

  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const computed = window.getComputedStyle(parent);
    if (
      computed.overflow !== 'visible' ||
      computed.overflowY !== 'visible' ||
      computed.height !== 'auto'
    ) {
      expand(parent);
    }
    parent = parent.parentElement;
  }

  return () => {
    saved.forEach(({ el, height, maxHeight, overflow, overflowY }) => {
      el.style.height = height;
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
      el.style.overflowY = overflowY;
    });
  };
}

/**
 * Create an event handler for turning an element into an image
 *
 * @param selector css selector of the parent element which should be turned into image
 * @param description name or a short description of what is being printed.
 *   Value will be normalized, and a date as well as a file extension will be added.
 * @param isExactSelector if false, searches for the closest ancestor that matches selector.
 * @returns event handler
 */
export default function downloadAsPdf(
  selector: string,
  description: string,
  isExactSelector = false,
) {
  return async (event: SyntheticEvent) => {
    const elementToPrint = isExactSelector
      ? document.querySelector(selector)
      : event.currentTarget.closest(selector);

    if (!elementToPrint) {
      return addWarningToast(
        t('PDF download failed, please refresh and try again.'),
      );
    }

    const restoreStyles = expandElementForCapture(
      elementToPrint as HTMLElement,
    );

    const options = {
      compression: pdfCompressionLevel,
      filename: `${generateFileStem(description)}.pdf`,
      excludeClassNames: ['header-controls'],
      scale: 2,
    };

    try {
      await domToPdf(elementToPrint, options);
    } catch (e) {
      logging.error('PDF generation failed', e);
    } finally {
      restoreStyles();
    }

    return undefined;
  };
}
